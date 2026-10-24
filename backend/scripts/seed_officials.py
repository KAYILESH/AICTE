#!/usr/bin/env python3
"""
AICTE SIH — Official Account Seeding Script
=============================================
Creates RB and PGRC official test accounts securely using the Supabase Admin API.

⚠️ SIH Prototype — Demo accounts only.
   Passwords are read from environment variables.
   Never commit credentials to version control.

Usage:
    1. Set environment variables:
       SUPABASE_URL=https://your-project.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
       RB_OFFICIAL_PASSWORD=<strong-demo-password>
       PGRC_OFFICIAL_PASSWORD=<strong-demo-password>
       SENIOR_OFFICIAL_PASSWORD=<strong-demo-password>

    2. Run:
       cd backend
       python scripts/seed_officials.py

    3. Test accounts created:
       rb.officer@aicte-demo.gov.in      → RB Official
       pgrc.officer@aicte-demo.gov.in    → PGRC Official
       rb.inspector@aicte-demo.gov.in    → RB Inspector
       pgrc.grievance@aicte-demo.gov.in  → PGRC Grievance Officer
       senior.official@aicte-demo.gov.in → Senior Official (cross-bureau)

The script is idempotent — re-running it will skip accounts that already exist.
"""

import os
import sys

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
RB_PASSWORD = os.environ.get("RB_OFFICIAL_PASSWORD", "")
PGRC_PASSWORD = os.environ.get("PGRC_OFFICIAL_PASSWORD", "")
SENIOR_PASSWORD = os.environ.get("SENIOR_OFFICIAL_PASSWORD", "")

if not all([SUPABASE_URL, SERVICE_KEY, RB_PASSWORD, PGRC_PASSWORD, SENIOR_PASSWORD]):
    print(
        "ERROR: Missing required environment variables.\n"
        "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "
        "RB_OFFICIAL_PASSWORD, PGRC_OFFICIAL_PASSWORD, SENIOR_OFFICIAL_PASSWORD"
    )
    sys.exit(1)

if SUPABASE_URL.startswith("https://placeholder"):
    print(
        "⚠️  Supabase is not configured (placeholder URL detected).\n"
        "   Skipping live account creation — demo session will be used instead.\n"
        "   To create real official accounts, configure a real Supabase project."
    )
    sys.exit(0)

OFFICIALS = [
    {
        "email": "rb.officer@aicte-demo.gov.in",
        "password_env": RB_PASSWORD,
        "role": "rb_official",
        "bureau": "RB",
        "display_name": "Shri Rajiv Nair (Synthetic)",
        "designation": "Inspection Officer — Regulation Bureau",
        "employee_id": "RB-DEMO-001",
    },
    {
        "email": "rb.inspector@aicte-demo.gov.in",
        "password_env": RB_PASSWORD,
        "role": "rb_official",
        "bureau": "RB",
        "display_name": "Dr. Meera Krishnan (Synthetic)",
        "designation": "Senior Inspector — Regulation Bureau",
        "employee_id": "RB-DEMO-002",
    },
    {
        "email": "pgrc.officer@aicte-demo.gov.in",
        "password_env": PGRC_PASSWORD,
        "role": "pgrc_official",
        "bureau": "PGRC",
        "display_name": "Smt. Ananya Sharma (Synthetic)",
        "designation": "Grievance Officer — PGRC",
        "employee_id": "PGRC-DEMO-001",
    },
    {
        "email": "pgrc.grievance@aicte-demo.gov.in",
        "password_env": PGRC_PASSWORD,
        "role": "pgrc_official",
        "bureau": "PGRC",
        "display_name": "Shri Arvind Pillai (Synthetic)",
        "designation": "Senior Grievance Officer — PGRC",
        "employee_id": "PGRC-DEMO-002",
    },
    {
        "email": "senior.official@aicte-demo.gov.in",
        "password_env": SENIOR_PASSWORD,
        "role": "senior_official",
        "bureau": "ALL",
        "display_name": "Prof. Sudha Rao (Synthetic)",
        "designation": "Senior Official — AICTE Monitoring",
        "employee_id": "SR-DEMO-001",
    },
]


def main():
    print(f"Connecting to Supabase at {SUPABASE_URL[:30]}…")
    supabase = create_client(SUPABASE_URL, SERVICE_KEY)

    for official in OFFICIALS:
        email = official["email"]
        print(f"\n→ Processing: {email}")

        # Check if user already exists
        existing = supabase.auth.admin.list_users()
        existing_emails = {u.email for u in existing}

        if email in existing_emails:
            print(f"  ℹ️  Account exists — skipping auth creation.")
            # Fetch existing user ID
            user_obj = next((u for u in existing if u.email == email), None)
            user_id = str(user_obj.id) if user_obj else None
        else:
            try:
                result = supabase.auth.admin.create_user({
                    "email": email,
                    "password": official["password_env"],
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": official["display_name"],
                        "is_official": True,
                    },
                })
                user_id = str(result.user.id)
                print(f"  ✅ Auth account created. UUID: {user_id}")
            except Exception as exc:
                print(f"  ❌ Failed to create auth account: {exc}")
                continue

        if not user_id:
            print(f"  ❌ Could not determine user UUID — skipping profile seeding.")
            continue

        # Upsert profiles record (required by FK constraint)
        try:
            supabase.table("profiles").upsert({
                "id": user_id,
                "full_name": official["display_name"],
                "email": email,
                "created_at": "2026-10-01T00:00:00+00:00",
                "updated_at": "2026-10-01T00:00:00+00:00",
            }, on_conflict="id").execute()
            print(f"  ✅ profiles row upserted.")
        except Exception as exc:
            print(f"  ❌ profiles upsert failed: {exc}")

        # Upsert user_roles
        try:
            supabase.table("user_roles").upsert({
                "user_id": user_id,
                "role": official["role"],
                "bureau": official["bureau"],
                "is_active": True,
            }, on_conflict="user_id").execute()
            print(f"  ✅ user_roles upserted: role={official['role']}, bureau={official['bureau']}")
        except Exception as exc:
            print(f"  ❌ user_roles upsert failed: {exc}")

        # Upsert official_profiles
        try:
            supabase.table("official_profiles").upsert({
                "id": user_id,
                "display_name": official["display_name"],
                "designation": official["designation"],
                "bureau": official["bureau"],
                "employee_id": official["employee_id"],
                "is_active": True,
            }, on_conflict="id").execute()
            print(f"  ✅ official_profiles upserted.")
        except Exception as exc:
            print(f"  ❌ official_profiles upsert failed: {exc}")

    print(
        "\n✅ Official account seeding complete.\n"
        "\nDemo credentials:\n"
        f"  RB Official:     rb.officer@aicte-demo.gov.in  / $RB_OFFICIAL_PASSWORD\n"
        f"  RB Inspector:    rb.inspector@aicte-demo.gov.in / $RB_OFFICIAL_PASSWORD\n"
        f"  PGRC Officer:    pgrc.officer@aicte-demo.gov.in / $PGRC_OFFICIAL_PASSWORD\n"
        f"  PGRC Grievance:  pgrc.grievance@aicte-demo.gov.in / $PGRC_OFFICIAL_PASSWORD\n"
        f"  Senior Official: senior.official@aicte-demo.gov.in / $SENIOR_OFFICIAL_PASSWORD\n"
        "\nAccess the portal at: http://localhost:3000/official/login"
    )


if __name__ == "__main__":
    main()
