from supabase import create_client, Client
from app.config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase_admin() -> Client:
    """
    Returns a Supabase client authenticated with the service-role key.
    Use ONLY on the server side for privileged operations.
    Never expose this client or its key to the frontend.
    """
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
        )
    return create_client(s.supabase_url, s.supabase_service_role_key)
