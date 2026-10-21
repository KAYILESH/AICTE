from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_student_role
from app.database import get_supabase_admin
from app.models.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(current_user: dict = Depends(require_student_role)):
    """Returns the authenticated student's profile."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return result.data


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    updates: ProfileUpdate,
    current_user: dict = Depends(require_student_role),
):
    """Updates permitted profile fields. Students cannot change their role."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]
    patch = updates.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="No updatable fields provided.")
    result = (
        supabase.table("profiles")
        .update(patch)
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return result.data[0]
