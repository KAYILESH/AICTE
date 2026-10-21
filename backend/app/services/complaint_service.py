"""
Complaint service — core business logic for creating and managing complaints.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.database import get_supabase_admin
from app.models.schemas import ComplaintCreate, RoutingResult
from app.routing.engine import get_router

logger = logging.getLogger(__name__)


def _generate_complaint_number(sequence: int) -> str:
    """
    Generates a human-readable complaint number.
    Format: AICTE-SIH-<YEAR>-<SEQUENCE_5DIGIT>
    Uniqueness is enforced by the database UNIQUE constraint on complaint_number.
    """
    year = datetime.now(timezone.utc).year
    return f"AICTE-SIH-{year}-{sequence:05d}"


async def create_complaint(
    payload: ComplaintCreate,
    user_id: str,
    user_email: str,
    full_name: str,
) -> dict:
    """
    Persists a complaint, generates a Complaint ID, triggers routing,
    and records all events. Returns the created complaint record.

    Idempotency: If a complaint with the same idempotency_key exists for
    this user, return the existing record rather than creating a duplicate.
    """
    supabase = get_supabase_admin()

    # ── Idempotency check ───────────────────────────────────────────────────
    existing = (
        supabase.table("complaints")
        .select("id, complaint_number, status")
        .eq("complainant_id", user_id)
        .eq("idempotency_key", payload.idempotency_key)
        .maybe_single()
        .execute()
    )
    if existing.data:
        logger.info(
            "Duplicate submission detected for user %s key %s",
            user_id,
            payload.idempotency_key,
        )
        return existing.data

    # ── Validate institution ────────────────────────────────────────────────
    institution = (
        supabase.table("institutions")
        .select("id, permanent_id, name, state, district")
        .eq("id", str(payload.institution_id))
        .single()
        .execute()
    )
    if not institution.data:
        raise ValueError("Institution not found. Please select a valid institution.")

    # ── Generate sequence number ────────────────────────────────────────────
    count_result = supabase.table("complaints").select("id", count="exact").execute()
    sequence = (count_result.count or 0) + 1
    complaint_number = _generate_complaint_number(sequence)

    # ── Insert complaint record ─────────────────────────────────────────────
    complaint_row = {
        "id": str(uuid.uuid4()),
        "complaint_number": complaint_number,
        "complainant_id": user_id,
        "complainant_email": user_email,
        "complainant_name": full_name,
        "complainant_type": payload.complainant_type,
        "mobile": payload.mobile,
        "institution_id": str(payload.institution_id),
        "course_or_department": payload.course_or_department,
        "category": payload.category,
        "subject": payload.subject.strip(),
        "description": payload.description.strip(),
        "date_of_incident": payload.date_of_incident,
        "academic_year": payload.academic_year,
        "previous_complaint": payload.previous_complaint,
        "previous_complaint_id": payload.previous_complaint_id,
        "status": "submitted",
        "assigned_bureau": None,
        "idempotency_key": payload.idempotency_key,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    insert_result = supabase.table("complaints").insert(complaint_row).execute()
    complaint = insert_result.data[0]

    # ── Record initial status history ───────────────────────────────────────
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint["id"],
        "status": "submitted",
        "note": "Complaint received and registered.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # ── Audit log ───────────────────────────────────────────────────────────
    supabase.table("audit_logs").insert({
        "actor_id": user_id,
        "action": "complaint_created",
        "entity_type": "complaint",
        "entity_id": complaint["id"],
        "details": {"complaint_number": complaint_number},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # ── Trigger routing ─────────────────────────────────────────────────────
    try:
        routing_result = await _route_complaint(
            complaint_id=complaint["id"],
            category=payload.category,
            subject=payload.subject,
            description=payload.description,
            institution_permanent_id=institution.data["permanent_id"],
        )
        # Update complaint with bureau assignment
        supabase.table("complaints").update({
            "assigned_bureau": routing_result.assigned_bureau,
            "status": "routing_completed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", complaint["id"]).execute()

        complaint["assigned_bureau"] = routing_result.assigned_bureau
        complaint["status"] = "routing_completed"
    except Exception as exc:
        logger.error("Routing failed for complaint %s: %s", complaint["id"], exc)
        # Safe fallback — preserve the complaint, mark for manual routing
        supabase.table("complaints").update({
            "assigned_bureau": "pending",
            "status": "submitted",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", complaint["id"]).execute()

    # ── Notification ────────────────────────────────────────────────────────
    try:
        bureau_msg = (
            f" Your case has been assigned to {complaint.get('assigned_bureau', 'the review team')}."
            if complaint.get("assigned_bureau") and complaint.get("assigned_bureau") != "pending"
            else ""
        )
        supabase.table("notifications").insert({
            "user_id": user_id,
            "complaint_id": complaint["id"],
            "message": (
                f"Complaint {complaint_number} submitted successfully.{bureau_msg} "
                "Track progress from your dashboard."
            ),
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Notification creation failed: %s", exc)

    return complaint


async def _route_complaint(
    complaint_id: str,
    category: str,
    subject: str,
    description: str,
    institution_permanent_id: str,
) -> RoutingResult:
    """Runs the routing engine and persists the routing decision."""
    router = get_router()
    result = router.route(category=category, subject=subject, description=description)

    supabase = get_supabase_admin()
    supabase.table("routing_decisions").insert({
        "complaint_id": complaint_id,
        "assigned_bureau": result.assigned_bureau,
        "confidence_score": result.confidence_score,
        "routing_reason": result.routing_reason,
        "routing_method": result.routing_method,
        "ruleset_version": result.ruleset_version,
        "created_at": result.timestamp.isoformat(),
    }).execute()

    # Record routing in status history
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": "routing_completed",
        "note": f"Routed to {result.assigned_bureau} via {result.routing_method}.",
        "created_at": result.timestamp.isoformat(),
    }).execute()

    return result


async def get_complaint_for_student(complaint_id: str, user_id: str) -> Optional[dict]:
    """
    Fetches full complaint detail. Enforces that the complainant_id matches
    the authenticated user — students cannot read each other's complaints.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("complaints")
        .select(
            "*, "
            "institutions(id, permanent_id, name, state, district), "
            "complaint_status_history(status, note, created_at), "
            "routing_decisions(assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at), "
            "complaint_attachments(id, filename, content_type, size_bytes, created_at), "
            "notifications(id)"
        )
        .eq("id", complaint_id)
        .eq("complainant_id", user_id)   # ← Row-level ownership check
        .maybe_single()
        .execute()
    )
    return result.data


async def get_complaints_for_student(
    user_id: str,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 10,
) -> tuple[int, list[dict]]:
    """Returns paginated, filtered complaint list for an authenticated student."""
    supabase = get_supabase_admin()
    query = (
        supabase.table("complaints")
        .select(
            "id, complaint_number, subject, category, status, assigned_bureau, created_at, updated_at, "
            "institutions(name)",
            count="exact",
        )
        .eq("complainant_id", user_id)
    )

    if status_filter and status_filter != "all":
        query = query.eq("status", status_filter)

    if search:
        query = query.or_(
            f"complaint_number.ilike.%{search}%,subject.ilike.%{search}%"
        )

    if sort == "oldest":
        query = query.order("created_at", desc=False)
    else:
        query = query.order("created_at", desc=True)

    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()
    total = result.count or 0
    return total, result.data or []


async def get_dashboard_stats(user_id: str) -> dict:
    """Returns complaint summary counts for the student dashboard."""
    supabase = get_supabase_admin()
    all_result = (
        supabase.table("complaints")
        .select("status", count="exact")
        .eq("complainant_id", user_id)
        .execute()
    )
    rows = all_result.data or []
    status_counts: dict[str, int] = {}
    for row in rows:
        s = row.get("status", "")
        status_counts[s] = status_counts.get(s, 0) + 1

    total = sum(status_counts.values())
    submitted = status_counts.get("submitted", 0) + status_counts.get("routing_completed", 0)
    under_process = (
        status_counts.get("assigned", 0)
        + status_counts.get("under_review", 0)
        + status_counts.get("under_process", 0)
    )
    resolved = status_counts.get("resolved", 0) + status_counts.get("closed", 0)

    return {
        "total": total,
        "submitted": submitted,
        "under_process": under_process,
        "resolved": resolved,
    }
