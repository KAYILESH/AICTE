"""
Official Portal API for AICTE RB and PGRC officials.

All endpoints:
- Validate a real Supabase JWT (no demo tokens).
- Read the user's role and bureau from the server-side user_roles table.
- Enforce bureau-scoped access: RB officials see only RB cases, PGRC see only PGRC cases.
- Use the service-role key only on the server — never expose it to the frontend.
- Write an immutable audit record for every case-changing action.

⚠️ SIH Prototype — Not an official AICTE service.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.database import get_supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/official", tags=["Official Portal"])


# ── Valid status transitions ──────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, list[str]] = {
    "submitted":                ["routing_completed", "assigned", "escalated"],
    "routing_completed":        ["assigned", "triage", "escalated"],
    "assigned":                 ["under_review", "additional_info_required", "transferred", "escalated"],
    "under_review":             ["under_process", "additional_info_required", "transferred", "escalated"],
    "under_process":            ["additional_info_required", "transferred", "escalated", "resolved"],
    "additional_info_required": ["under_review", "under_process", "escalated", "transferred"],
    "transferred":              ["under_review", "assigned", "escalated"],
    "escalated":                ["under_review", "under_process", "resolved", "closed"],
    "resolved":                 ["closed"],
    "closed":                   [],
}

BUREAU_ROLES = {
    "RB":   ["rb_official", "senior_official", "system_admin"],
    "PGRC": ["pgrc_official", "senior_official", "system_admin"],
    "ALL":  ["senior_official", "system_admin"],
}


# ── Authentication helpers ────────────────────────────────────────────────────

def _get_official_role(user_id: str) -> tuple[str, str]:
    """
    Reads role and bureau from user_roles table.
    Returns (role, bureau) tuple.
    Raises 403 if not an official or account inactive.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("user_roles")
        .select("role, bureau, is_active")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=403,
            detail="Access denied. No official role found for this account.",
        )
    row = result.data
    if not row.get("is_active"):
        raise HTTPException(status_code=403, detail="This official account has been deactivated.")
    role: str = row["role"]
    bureau: str = row.get("bureau") or ""
    if role not in ("rb_official", "pgrc_official", "senior_official", "system_admin"):
        raise HTTPException(status_code=403, detail="Students cannot access the official portal.")
    return role, bureau


def _require_official(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency — enriches current_user with role and bureau from DB."""
    role, bureau = _get_official_role(current_user["sub"])
    return {**current_user, "db_role": role, "db_bureau": bureau}


def _bureau_for_role(role: str, db_bureau: str) -> Optional[str]:
    """Returns the bureau this official is scoped to, or None if unrestricted."""
    if role in ("senior_official", "system_admin"):
        return None  # Unrestricted
    return db_bureau  # 'RB' or 'PGRC'


def _check_case_access(complaint: dict, db_role: str, db_bureau: str) -> None:
    """Ensures the official's bureau matches the complaint's assigned_bureau."""
    if db_role in ("senior_official", "system_admin"):
        return
    case_bureau = complaint.get("assigned_bureau")
    if case_bureau != db_bureau:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. This case is assigned to {case_bureau}, not {db_bureau}.",
        )


def _write_audit(
    actor_id: str,
    action: str,
    entity_id: str,
    entity_type: str = "complaint",
    details: Optional[dict] = None,
) -> None:
    try:
        supabase = get_supabase_admin()
        supabase.table("audit_logs").insert({
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.error("Audit write failed: %s", exc)


# ── Request/Response Schemas ──────────────────────────────────────────────────

class OfficialProfileOut(BaseModel):
    user_id: str
    display_name: str
    designation: Optional[str] = None
    bureau: str
    employee_id: Optional[str] = None
    role: str


class CaseSummary(BaseModel):
    id: str
    complaint_number: str
    institution_name: str
    institution_permanent_id: str
    subject: str
    category: str
    status: str
    assigned_bureau: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    created_at: str
    updated_at: str
    expected_disposal_date: Optional[str] = None
    is_overdue: Optional[bool] = None
    complainant_name: str


class DashboardStatsOut(BaseModel):
    total: int
    new_unreviewed: int
    under_process: int
    additional_info: int
    transferred: int
    resolved: int
    overdue: int


class StatusUpdateRequest(BaseModel):
    new_status: str = Field(..., description="Target status for the case")
    action_reason: str = Field(..., min_length=5, max_length=2000)
    note_for_student: Optional[str] = Field(None, max_length=2000)
    internal_note: Optional[str] = Field(None, max_length=4000)
    next_action: Optional[str] = Field(None, max_length=500)
    expected_disposal_date: Optional[str] = None


class AddNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    note_type: str = Field("internal", pattern="^(internal|student_visible)$")


class TransferRequest(BaseModel):
    target_bureau: str = Field(..., pattern="^(RB|PGRC)$")
    reason: str = Field(..., min_length=10, max_length=2000)


class EscalationRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)
    internal_note: Optional[str] = Field(None, max_length=4000)


class AssignOfficerRequest(BaseModel):
    officer_id: str
    reason: Optional[str] = Field(None, max_length=500)


class ResolutionRequest(BaseModel):
    resolution_summary: str = Field(..., min_length=10, max_length=4000)
    internal_note: Optional[str] = Field(None, max_length=4000)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", tags=["Official Auth"])
async def official_login():
    """
    Official login is handled by the existing Supabase auth endpoint.
    After login, call GET /api/v1/official/me to retrieve role/bureau
    and determine which dashboard to redirect to.
    Frontend should POST to Supabase Auth, then call /me.
    """
    return {
        "detail": "Use Supabase authentication and then GET /api/v1/official/me for role-based redirection.",
        "supabase_auth_endpoint": "/auth/v1/token?grant_type=password",
    }


@router.get("/me", response_model=OfficialProfileOut)
async def get_official_me(official: dict = Depends(_require_official)):
    """Returns the authenticated official's profile and bureau. Used for role-based routing."""
    supabase = get_supabase_admin()
    profile = (
        supabase.table("official_profiles")
        .select("display_name, designation, bureau, employee_id")
        .eq("id", official["sub"])
        .maybe_single()
        .execute()
    )
    if profile.data:
        return OfficialProfileOut(
            user_id=official["sub"],
            display_name=profile.data["display_name"],
            designation=profile.data.get("designation"),
            bureau=profile.data["bureau"],
            employee_id=profile.data.get("employee_id"),
            role=official["db_role"],
        )
    # Fallback for officials without an official_profile record yet
    return OfficialProfileOut(
        user_id=official["sub"],
        display_name=official.get("email", "Official"),
        bureau=official["db_bureau"],
        role=official["db_role"],
    )


@router.get("/dashboard", response_model=DashboardStatsOut)
async def get_dashboard_stats(official: dict = Depends(_require_official)):
    """Returns bureau-scoped complaint summary counts for the official dashboard."""
    supabase = get_supabase_admin()
    bureau = _bureau_for_role(official["db_role"], official["db_bureau"])

    query = supabase.table("complaints").select("status, expected_disposal_date", count="exact")
    if bureau:
        query = query.eq("assigned_bureau", bureau)

    result = query.execute()
    rows = result.data or []

    counts: dict[str, int] = {}
    overdue = 0
    today_str = datetime.now(timezone.utc).date().isoformat()

    for row in rows:
        s = row.get("status", "")
        counts[s] = counts.get(s, 0) + 1
        disposal = row.get("expected_disposal_date")
        if disposal and disposal < today_str and s not in ("resolved", "closed"):
            overdue += 1

    return DashboardStatsOut(
        total=sum(counts.values()),
        new_unreviewed=counts.get("submitted", 0) + counts.get("routing_completed", 0) + counts.get("assigned", 0),
        under_process=counts.get("under_review", 0) + counts.get("under_process", 0),
        additional_info=counts.get("additional_info_required", 0),
        transferred=counts.get("transferred", 0) + counts.get("escalated", 0),
        resolved=counts.get("resolved", 0) + counts.get("closed", 0),
        overdue=overdue,
    )


@router.get("/cases")
async def list_cases(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    overdue_only: bool = Query(False),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=50),
    official: dict = Depends(_require_official),
):
    """Returns bureau-scoped, paginated, filtered list of complaint cases."""
    supabase = get_supabase_admin()
    bureau = _bureau_for_role(official["db_role"], official["db_bureau"])

    query = supabase.table("complaints").select(
        "id, complaint_number, complainant_name, subject, category, status, "
        "assigned_bureau, expected_disposal_date, created_at, updated_at, "
        "institutions(name, permanent_id)",
        count="exact",
    )

    if bureau:
        query = query.eq("assigned_bureau", bureau)
    if status and status != "all":
        query = query.eq("status", status)
    if category and category != "all":
        query = query.eq("category", category)
    if search:
        query = query.or_(
            f"complaint_number.ilike.%{search}%,"
            f"complainant_name.ilike.%{search}%,"
            f"subject.ilike.%{search}%"
        )
    if overdue_only:
        today_str = datetime.now(timezone.utc).date().isoformat()
        query = query.lt("expected_disposal_date", today_str).not_.in_("status", ["resolved", "closed"])

    if sort == "oldest":
        query = query.order("created_at", desc=False)
    else:
        query = query.order("created_at", desc=True)

    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()
    today_str = datetime.now(timezone.utc).date().isoformat()

    items = []
    for row in result.data or []:
        inst = row.get("institutions") or {}
        disposal = row.get("expected_disposal_date")
        is_overdue = (
            bool(disposal)
            and disposal < today_str
            and row.get("status") not in ("resolved", "closed")
        )
        items.append({
            "id": row["id"],
            "complaint_number": row["complaint_number"],
            "institution_name": inst.get("name", "Unknown"),
            "institution_permanent_id": inst.get("permanent_id", "—"),
            "complainant_name": row.get("complainant_name", "—"),
            "subject": row["subject"],
            "category": row["category"],
            "status": row["status"],
            "assigned_bureau": row.get("assigned_bureau"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "expected_disposal_date": disposal,
            "is_overdue": is_overdue,
        })

    return {
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/cases/{complaint_id}")
async def get_case_detail(
    complaint_id: str,
    official: dict = Depends(_require_official),
):
    """Returns full case detail. Enforces bureau access control."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("complaints")
        .select(
            "*, "
            "institutions(id, permanent_id, name, state, district), "
            "complaint_status_history(status, note, changed_by, created_at), "
            "routing_decisions(assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at), "
            "complaint_attachments(id, filename, content_type, size_bytes, created_at)"
        )
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found.")

    complaint = result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    # Load case notes for this bureau official
    notes_result = (
        supabase.table("case_notes")
        .select("id, note_type, content, author_id, created_at")
        .eq("complaint_id", complaint_id)
        .order("created_at", desc=False)
        .execute()
    )

    # Load case actions history
    actions_result = (
        supabase.table("case_actions")
        .select("id, action_type, previous_status, new_status, previous_bureau, new_bureau, action_reason, next_action_summary, created_at, actor_id")
        .eq("complaint_id", complaint_id)
        .order("created_at", desc=False)
        .execute()
    )

    # Enrich student-visible notes into public_remarks field check
    complaint["case_notes"] = notes_result.data or []
    complaint["case_actions"] = actions_result.data or []

    return complaint


@router.patch("/cases/{complaint_id}/status")
async def update_case_status(
    complaint_id: str,
    payload: StatusUpdateRequest,
    official: dict = Depends(_require_official),
):
    """
    Updates the status of a case. Validates the transition is legal.
    Records a case_action and complaint_status_history entry.
    Optionally adds an internal note and/or student-visible remark.
    """
    supabase = get_supabase_admin()

    # Fetch complaint
    c_result = (
        supabase.table("complaints")
        .select("id, status, assigned_bureau, complaint_number")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    complaint = c_result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    current_status = complaint["status"]
    new_status = payload.new_status

    # Validate transition
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Transition from '{current_status}' to '{new_status}' is not permitted. "
                   f"Allowed next states: {allowed}",
        )

    now = datetime.now(timezone.utc).isoformat()

    # Update complaint record
    update_data: dict = {
        "status": new_status,
        "last_action_at": now,
        "updated_at": now,
    }
    if payload.next_action:
        update_data["next_action"] = payload.next_action
    if payload.expected_disposal_date:
        update_data["expected_disposal_date"] = payload.expected_disposal_date
    if payload.note_for_student:
        update_data["public_remarks"] = payload.note_for_student
    if new_status == "resolved":
        update_data["date_resolved"] = now
    if new_status in ("resolved", "closed"):
        update_data["resolution_summary"] = payload.action_reason

    supabase.table("complaints").update(update_data).eq("id", complaint_id).execute()

    # Status history
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": new_status,
        "note": payload.action_reason,
        "changed_by": official["sub"],
        "created_at": now,
    }).execute()

    # Case action audit
    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "status_change",
        "previous_status": current_status,
        "new_status": new_status,
        "action_reason": payload.action_reason,
        "next_action_summary": payload.next_action,
        "expected_disposal_date": payload.expected_disposal_date,
        "details": {"complaint_number": complaint["complaint_number"]},
        "created_at": now,
    }).execute()

    # Internal note
    if payload.internal_note:
        supabase.table("case_notes").insert({
            "complaint_id": complaint_id,
            "author_id": official["sub"],
            "note_type": "internal",
            "content": payload.internal_note,
            "created_at": now,
        }).execute()

    _write_audit(
        actor_id=official["sub"],
        action="status_updated",
        entity_id=complaint_id,
        details={"from": current_status, "to": new_status, "reason": payload.action_reason},
    )

    return {"success": True, "new_status": new_status, "complaint_id": complaint_id}


@router.post("/cases/{complaint_id}/notes")
async def add_case_note(
    complaint_id: str,
    payload: AddNoteRequest,
    official: dict = Depends(_require_official),
):
    """Adds an internal or student-visible note to a case."""
    supabase = get_supabase_admin()

    c_result = (
        supabase.table("complaints")
        .select("id, assigned_bureau")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    _check_case_access(c_result.data, official["db_role"], official["db_bureau"])

    now = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())

    supabase.table("case_notes").insert({
        "id": note_id,
        "complaint_id": complaint_id,
        "author_id": official["sub"],
        "note_type": payload.note_type,
        "content": payload.content,
        "created_at": now,
    }).execute()

    # If student-visible, record a case action
    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "note_added",
        "action_reason": f"[{payload.note_type}] {payload.content[:200]}",
        "details": {"note_id": note_id, "note_type": payload.note_type},
        "created_at": now,
    }).execute()

    _write_audit(official["sub"], "note_added", complaint_id, details={"note_type": payload.note_type})

    return {"success": True, "note_id": note_id}


@router.post("/cases/{complaint_id}/transfer")
async def transfer_case(
    complaint_id: str,
    payload: TransferRequest,
    official: dict = Depends(_require_official),
):
    """
    Transfers a case to a different bureau.
    Requires a reason. Records the transfer in case_actions and status_history.
    """
    supabase = get_supabase_admin()

    c_result = (
        supabase.table("complaints")
        .select("id, status, assigned_bureau, complaint_number")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    complaint = c_result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    if complaint["assigned_bureau"] == payload.target_bureau:
        raise HTTPException(status_code=422, detail="Case is already assigned to the target bureau.")

    now = datetime.now(timezone.utc).isoformat()
    old_bureau = complaint["assigned_bureau"]

    supabase.table("complaints").update({
        "assigned_bureau": payload.target_bureau,
        "status": "transferred",
        "last_action_at": now,
        "updated_at": now,
        "assigned_officer": None,  # Clear officer assignment on transfer
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": "transferred",
        "note": f"Transferred from {old_bureau} to {payload.target_bureau}. Reason: {payload.reason}",
        "changed_by": official["sub"],
        "created_at": now,
    }).execute()

    # Record bureau assignment history
    supabase.table("bureau_assignments").insert({
        "complaint_id": complaint_id,
        "bureau": payload.target_bureau,
        "assigned_by": official["sub"],
        "reason": payload.reason,
        "created_at": now,
    }).execute()

    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "transfer",
        "previous_status": complaint["status"],
        "new_status": "transferred",
        "previous_bureau": old_bureau,
        "new_bureau": payload.target_bureau,
        "action_reason": payload.reason,
        "details": {"complaint_number": complaint["complaint_number"]},
        "created_at": now,
    }).execute()

    _write_audit(
        official["sub"], "case_transferred", complaint_id,
        details={"from": old_bureau, "to": payload.target_bureau, "reason": payload.reason},
    )

    return {"success": True, "new_bureau": payload.target_bureau}


@router.post("/cases/{complaint_id}/escalate")
async def escalate_case(
    complaint_id: str,
    payload: EscalationRequest,
    official: dict = Depends(_require_official),
):
    """Escalates a case. Requires a reason. Records escalation in audit trail."""
    supabase = get_supabase_admin()

    c_result = (
        supabase.table("complaints")
        .select("id, status, assigned_bureau, complaint_number")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    complaint = c_result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    if complaint["status"] == "escalated":
        raise HTTPException(status_code=422, detail="Case is already escalated.")

    now = datetime.now(timezone.utc).isoformat()
    old_status = complaint["status"]

    supabase.table("complaints").update({
        "status": "escalated",
        "last_action_at": now,
        "updated_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": "escalated",
        "note": f"Escalated. Reason: {payload.reason}",
        "changed_by": official["sub"],
        "created_at": now,
    }).execute()

    if payload.internal_note:
        supabase.table("case_notes").insert({
            "complaint_id": complaint_id,
            "author_id": official["sub"],
            "note_type": "internal",
            "content": payload.internal_note,
            "created_at": now,
        }).execute()

    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "escalation",
        "previous_status": old_status,
        "new_status": "escalated",
        "action_reason": payload.reason,
        "details": {"complaint_number": complaint["complaint_number"]},
        "created_at": now,
    }).execute()

    _write_audit(official["sub"], "case_escalated", complaint_id, details={"reason": payload.reason})

    return {"success": True, "new_status": "escalated"}


@router.post("/cases/{complaint_id}/resolve")
async def resolve_case(
    complaint_id: str,
    payload: ResolutionRequest,
    official: dict = Depends(_require_official),
):
    """Marks a case as resolved. Requires a resolution summary."""
    supabase = get_supabase_admin()

    c_result = (
        supabase.table("complaints")
        .select("id, status, assigned_bureau, complaint_number")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    complaint = c_result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    if complaint["status"] in ("resolved", "closed"):
        raise HTTPException(status_code=422, detail="Case is already resolved or closed.")

    now = datetime.now(timezone.utc).isoformat()

    supabase.table("complaints").update({
        "status": "resolved",
        "resolution_summary": payload.resolution_summary,
        "date_resolved": now,
        "last_action_at": now,
        "updated_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": "resolved",
        "note": f"Resolved. Summary: {payload.resolution_summary}",
        "changed_by": official["sub"],
        "created_at": now,
    }).execute()

    if payload.internal_note:
        supabase.table("case_notes").insert({
            "complaint_id": complaint_id,
            "author_id": official["sub"],
            "note_type": "internal",
            "content": payload.internal_note,
            "created_at": now,
        }).execute()

    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "resolution",
        "previous_status": complaint["status"],
        "new_status": "resolved",
        "action_reason": payload.resolution_summary,
        "details": {"complaint_number": complaint["complaint_number"]},
        "created_at": now,
    }).execute()

    _write_audit(official["sub"], "case_resolved", complaint_id)

    return {"success": True, "new_status": "resolved"}


@router.post("/cases/{complaint_id}/assign")
async def assign_officer(
    complaint_id: str,
    payload: AssignOfficerRequest,
    official: dict = Depends(_require_official),
):
    """Assigns a case to a specific officer within the bureau."""
    supabase = get_supabase_admin()

    c_result = (
        supabase.table("complaints")
        .select("id, status, assigned_bureau, complaint_number")
        .eq("id", complaint_id)
        .maybe_single()
        .execute()
    )
    if not c_result.data:
        raise HTTPException(status_code=404, detail="Case not found.")
    complaint = c_result.data
    _check_case_access(complaint, official["db_role"], official["db_bureau"])

    # Validate the target officer belongs to the same bureau
    officer_role = (
        supabase.table("user_roles")
        .select("role, bureau, is_active")
        .eq("user_id", payload.officer_id)
        .maybe_single()
        .execute()
    )
    if not officer_role.data or not officer_role.data.get("is_active"):
        raise HTTPException(status_code=422, detail="Target officer not found or inactive.")
    if officer_role.data["bureau"] != complaint["assigned_bureau"] and official["db_role"] not in ("senior_official", "system_admin"):
        raise HTTPException(
            status_code=403,
            detail="Cannot assign case to an officer outside the complaint's assigned bureau.",
        )

    now = datetime.now(timezone.utc).isoformat()

    # Mark previous assignment as non-current
    supabase.table("case_officer_assignments").update({"is_current": False}).eq(
        "complaint_id", complaint_id
    ).eq("is_current", True).execute()

    # Insert new assignment
    supabase.table("case_officer_assignments").insert({
        "complaint_id": complaint_id,
        "officer_id": payload.officer_id,
        "assigned_by": official["sub"],
        "bureau": complaint["assigned_bureau"],
        "reason": payload.reason,
        "is_current": True,
        "created_at": now,
    }).execute()

    supabase.table("complaints").update({
        "assigned_officer": payload.officer_id,
        "date_assigned": now,
        "status": "assigned",
        "last_action_at": now,
        "updated_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "status": "assigned",
        "note": f"Assigned to officer {payload.officer_id}. {payload.reason or ''}".strip(),
        "changed_by": official["sub"],
        "created_at": now,
    }).execute()

    supabase.table("case_actions").insert({
        "complaint_id": complaint_id,
        "actor_id": official["sub"],
        "action_type": "assignment",
        "new_status": "assigned",
        "action_reason": payload.reason or "Officer assigned.",
        "details": {"officer_id": payload.officer_id, "complaint_number": complaint["complaint_number"]},
        "created_at": now,
    }).execute()

    _write_audit(official["sub"], "officer_assigned", complaint_id, details={"officer_id": payload.officer_id})

    return {"success": True, "assigned_officer": payload.officer_id}


@router.get("/officials")
async def list_bureau_officials(official: dict = Depends(_require_official)):
    """Lists active officials within the same bureau. Used for assignment UI."""
    supabase = get_supabase_admin()
    bureau = official["db_bureau"]

    result = (
        supabase.table("official_profiles")
        .select("id, display_name, designation, bureau, employee_id")
        .eq("bureau", bureau)
        .eq("is_active", True)
        .execute()
    )
    return {"officials": result.data or []}


@router.get("/notifications")
async def get_official_notifications(official: dict = Depends(_require_official)):
    """Returns unread notifications for the authenticated official."""
    supabase = get_supabase_admin()

    result = (
        supabase.table("notifications")
        .select("id, message, complaint_id, is_read, created_at")
        .eq("user_id", official["sub"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"notifications": result.data or []}
