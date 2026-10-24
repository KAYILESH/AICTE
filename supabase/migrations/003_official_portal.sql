-- ============================================================
-- AICTE Smart Complaint Management System
-- Migration: 003_official_portal.sql
--
-- ⚠️ SIH Prototype — not an official AICTE database schema.
-- Adds official user roles, RB/PGRC portal support, case notes,
-- officer assignments, and enforced RLS for official access.
-- ============================================================

-- ── USER ROLES ────────────────────────────────────────────────
-- Stores the role and bureau for each registered user.
-- NEVER trust role values from the frontend — always read from this table.
CREATE TABLE IF NOT EXISTS public.user_roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN (
                    'student','rb_official','pgrc_official',
                    'senior_official','system_admin')),
    bureau      TEXT CHECK (bureau IN ('RB','PGRC','ALL')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON public.user_roles(role);

DROP TRIGGER IF EXISTS set_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER set_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── OFFICIAL PROFILES ─────────────────────────────────────────
-- Extended profile data for RB/PGRC officials.
CREATE TABLE IF NOT EXISTS public.official_profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name    TEXT NOT NULL,
    designation     TEXT,
    bureau          TEXT NOT NULL CHECK (bureau IN ('RB','PGRC','ALL')),
    employee_id     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_official_profiles_updated_at ON public.official_profiles;
CREATE TRIGGER set_official_profiles_updated_at
    BEFORE UPDATE ON public.official_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── CASE OFFICER ASSIGNMENTS ──────────────────────────────────
-- Tracks officer-level assignment within a bureau for each complaint.
CREATE TABLE IF NOT EXISTS public.case_officer_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    officer_id      UUID REFERENCES auth.users(id),
    assigned_by     UUID REFERENCES auth.users(id),
    bureau          TEXT NOT NULL CHECK (bureau IN ('RB','PGRC','triage','pending')),
    reason          TEXT,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_officer_complaint_id ON public.case_officer_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_case_officer_officer_id   ON public.case_officer_assignments(officer_id);
CREATE INDEX IF NOT EXISTS idx_case_officer_is_current   ON public.case_officer_assignments(complaint_id, is_current);

-- ── INTERNAL CASE NOTES ───────────────────────────────────────
-- Notes visible only to officials (internal) or also to students (student_visible).
CREATE TABLE IF NOT EXISTS public.case_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES auth.users(id),
    note_type       TEXT NOT NULL DEFAULT 'internal'
                    CHECK (note_type IN ('internal','student_visible','action_record')),
    content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_complaint_id ON public.case_notes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_author_id    ON public.case_notes(author_id);

-- ── CASE ACTIONS ──────────────────────────────────────────────
-- Immutable audit record of every official action on a complaint.
CREATE TABLE IF NOT EXISTS public.case_actions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id           UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    actor_id               UUID NOT NULL REFERENCES auth.users(id),
    action_type            TEXT NOT NULL CHECK (action_type IN (
                               'status_change','assignment','note_added','transfer',
                               'escalation','additional_info_requested','document_added',
                               'resolution','closure')),
    previous_status        TEXT,
    new_status             TEXT,
    previous_bureau        TEXT,
    new_bureau             TEXT,
    action_reason          TEXT,
    next_action_summary    TEXT,
    expected_disposal_date DATE,
    details                JSONB,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_actions_complaint_id ON public.case_actions(complaint_id);
CREATE INDEX IF NOT EXISTS idx_case_actions_actor_id     ON public.case_actions(actor_id);

-- ── EXTEND COMPLAINTS TABLE ────────────────────────────────────
ALTER TABLE public.complaints
    ADD COLUMN IF NOT EXISTS assigned_officer    UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS next_action         TEXT,
    ADD COLUMN IF NOT EXISTS last_action_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_assigned       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_resolved       TIMESTAMPTZ;

-- ── HELPER FUNCTIONS ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT AS $$
    SELECT role FROM public.user_roles WHERE user_id = uid AND is_active = TRUE LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_bureau(uid UUID)
RETURNS TEXT AS $$
    SELECT bureau FROM public.user_roles WHERE user_id = uid AND is_active = TRUE LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

-- user_roles: users can read only their own row
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users read own role'
  ) THEN
    CREATE POLICY "Users read own role" ON public.user_roles
        FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- official_profiles: officials read their own record only
ALTER TABLE public.official_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'official_profiles' AND policyname = 'Officials read own profile'
  ) THEN
    CREATE POLICY "Officials read own profile" ON public.official_profiles
        FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- case_notes: backend service-role only (no direct client access)
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'case_notes' AND policyname = 'No direct client access to case notes'
  ) THEN
    CREATE POLICY "No direct client access to case notes" ON public.case_notes
        FOR ALL USING (FALSE);
  END IF;
END $$;

-- case_actions: backend service-role only
ALTER TABLE public.case_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'case_actions' AND policyname = 'No direct client access to case actions'
  ) THEN
    CREATE POLICY "No direct client access to case actions" ON public.case_actions
        FOR ALL USING (FALSE);
  END IF;
END $$;

-- case_officer_assignments: backend service-role only
ALTER TABLE public.case_officer_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'case_officer_assignments' AND policyname = 'No direct client access to officer assignments'
  ) THEN
    CREATE POLICY "No direct client access to officer assignments" ON public.case_officer_assignments
        FOR ALL USING (FALSE);
  END IF;
END $$;

-- audit_logs: backend service-role only
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'No direct client access to audit logs'
  ) THEN
    CREATE POLICY "No direct client access to audit logs" ON public.audit_logs
        FOR ALL USING (FALSE);
  END IF;
END $$;

-- bureau_assignments: backend service-role only
ALTER TABLE public.bureau_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bureau_assignments' AND policyname = 'No direct client access to bureau assignments'
  ) THEN
    CREATE POLICY "No direct client access to bureau assignments" ON public.bureau_assignments
        FOR ALL USING (FALSE);
  END IF;
END $$;
