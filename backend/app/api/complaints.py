from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, BackgroundTasks
from typing import Optional
from uuid import UUID
import uuid
import logging
from datetime import datetime, timezone

from app.auth import require_student_role
from app.database import get_supabase_admin
from app.models.schemas import (
    ComplaintCreate, ComplaintDetail, ComplaintListResponse, DashboardStats,
)
from app.services.complaint_service import (
    create_complaint,
    get_complaint_for_student,
    get_complaints_for_student,
    get_dashboard_stats,
)
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.get("/dashboard-stats", response_model=DashboardStats)
async def dashboard_stats(current_user: dict = Depends(require_student_role)):
    """Returns complaint summary counts for the authenticated student's dashboard."""
    stats = await get_dashboard_stats(user_id=current_user["sub"])
    return stats


@router.get("", response_model=ComplaintListResponse)
async def list_complaints(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_student_role),
):
    """Returns a paginated, filtered list of the student's own complaints."""
    total, items = await get_complaints_for_student(
        user_id=current_user["sub"],
        status_filter=status,
        search=search,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("", status_code=201)
async def submit_complaint(
    payload: ComplaintCreate,
    current_user: dict = Depends(require_student_role),
):
    """
    Submits a new complaint. Enforces idempotency to prevent duplicate
    submissions from repeated clicks or network retries.
    """
    try:
        # Fetch profile for name
        supabase = get_supabase_admin()
        profile = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", current_user["sub"])
            .maybe_single()
            .execute()
        )
        full_name = profile.data["full_name"] if profile.data else current_user.get("email", "")

        complaint = await create_complaint(
            payload=payload,
            user_id=current_user["sub"],
            user_email=current_user.get("email", ""),
            full_name=full_name,
        )
        return {"complaint": complaint}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Complaint submission failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Complaint submission failed. Your data has not been lost. Please try again.",
        )


@router.get("/{complaint_id}", response_model=ComplaintDetail)
async def get_complaint_detail(
    complaint_id: UUID,
    current_user: dict = Depends(require_student_role),
):
    """
    Returns full detail for a single complaint.
    Enforces row-level ownership — students cannot access each other's complaints.
    """
    data = await get_complaint_for_student(
        complaint_id=str(complaint_id),
        user_id=current_user["sub"],
    )
    if not data:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found or you do not have permission to view it.",
        )
    return data


@router.post("/{complaint_id}/attachments", status_code=201)
async def upload_attachment(
    complaint_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_student_role),
):
    """
    Uploads a supporting document for a complaint.
    - Validates file type and size server-side.
    - Stores in private Supabase Storage bucket.
    - Records metadata in complaint_attachments table.
    """
    settings = get_settings()
    supabase = get_supabase_admin()
    user_id = current_user["sub"]

    # Verify complaint ownership
    ownership = (
        supabase.table("complaints")
        .select("id")
        .eq("id", str(complaint_id))
        .eq("complainant_id", user_id)
        .maybe_single()
        .execute()
    )
    if not ownership.data:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # Validate content type
    if file.content_type not in settings.allowed_file_types_list:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file.content_type}' is not allowed. "
                   f"Accepted types: {', '.join(settings.allowed_file_types_list)}",
        )

    # Read and size-check
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB.",
        )

    # Store in private bucket
    attachment_id = str(uuid.uuid4())
    safe_name = f"{attachment_id}/{file.filename}"
    storage_path = f"complaints/{str(complaint_id)}/{safe_name}"

    try:
        supabase.storage.from_("complaint-attachments").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type},
        )
    except Exception as exc:
        logger.error("Storage upload failed: %s", exc)
        raise HTTPException(status_code=500, detail="File upload failed. Please try again.")

    # Persist metadata
    supabase.table("complaint_attachments").insert({
        "id": attachment_id,
        "complaint_id": str(complaint_id),
        "filename": file.filename,
        "storage_path": storage_path,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "uploaded_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"id": attachment_id, "filename": file.filename, "size_bytes": len(content)}
