from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import get_settings
from app.database import get_supabase_admin

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """
    Validates the Supabase JWT from the Authorization header.
    Returns the decoded JWT payload (includes user id, email, role, etc.)
    Raises 401 if token is invalid or expired.
    """
    settings = get_settings()
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")


def require_student_role(current_user: dict = Depends(get_current_user)) -> dict:
    """Ensure the authenticated user has the 'authenticated' role (student)."""
    role = current_user.get("role", "")
    if role not in ("authenticated", "student"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    return current_user
