from fastapi import APIRouter, Depends
from app.auth import require_student_role
from app.database import get_supabase_admin

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(current_user: dict = Depends(require_student_role)):
    """Returns all notifications for the authenticated student, newest first."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("notifications")
        .select("id, message, complaint_id, is_read, created_at, complaints(complaint_number)")
        .eq("user_id", current_user["sub"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"notifications": result.data or []}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(require_student_role),
):
    """Marks a single notification as read. Enforces ownership."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", current_user["sub"])   # Ownership check
        .execute()
    )
    return {"updated": len(result.data or []) > 0}


@router.patch("/mark-all-read")
async def mark_all_read(current_user: dict = Depends(require_student_role)):
    """Marks all of the student's notifications as read."""
    supabase = get_supabase_admin()
    supabase.table("notifications").update({"is_read": True}).eq(
        "user_id", current_user["sub"]
    ).execute()
    return {"updated": True}
