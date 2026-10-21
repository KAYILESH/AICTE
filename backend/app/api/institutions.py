from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import require_student_role
from app.database import get_supabase_admin

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("")
async def search_institutions(
    q: Optional[str] = Query(None, description="Search by name or permanent ID"),
    state: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_student_role),
):
    """
    Searches the institution directory.
    Returns only synthetic/seeded records — never invent real institution data.
    """
    supabase = get_supabase_admin()
    query = supabase.table("institutions").select(
        "id, permanent_id, name, state, district, is_synthetic"
    ).limit(limit)

    if state:
        query = query.eq("state", state)

    if q:
        query = query.or_(
            f"name.ilike.%{q}%,permanent_id.ilike.%{q}%"
        )

    result = query.execute()
    return {"institutions": result.data or []}


@router.get("/{permanent_id}")
async def get_institution_by_permanent_id(
    permanent_id: str,
    current_user: dict = Depends(require_student_role),
):
    """Fetches a single institution by its AICTE Permanent ID."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("institutions")
        .select("id, permanent_id, name, state, district, is_synthetic")
        .eq("permanent_id", permanent_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return {"institution": None, "not_found": True}
    return {"institution": result.data, "not_found": False}
