-- ============================================================
-- AICTE Smart Complaint Management System — Database Schema
-- Migration: 001_initial_schema.sql
--
-- ⚠️ SIH Prototype — not an official AICTE database schema.
-- This schema must be validated against official AICTE data
-- models before use in a real deployment.
--
-- Run in Supabase SQL Editor or via supabase db push.
-- ============================================================

-- ── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
-- Extends Supabase auth.users with student-facing profile data.
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
    email       TEXT NOT NULL,
    mobile      TEXT CHECK (mobile ~ '^\+?[0-9\s\-]{7,20}$'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── INSTITUTIONS ─────────────────────────────────────────────
-- Seeded with synthetic demo data. Never use real institution
-- records without proper authorization from AICTE.
CREATE TABLE IF NOT EXISTS public.institutions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permanent_id   TEXT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
    state          TEXT NOT NULL,
    district       TEXT NOT NULL,
    address        TEXT,
    is_synthetic   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_permanent_id ON public.institutions(permanent_id);
CREATE INDEX IF NOT EXISTS idx_institutions_state ON public.institutions(state);
CREATE INDEX IF NOT EXISTS idx_institutions_name ON public.institutions USING GIN (to_tsvector('english', name));

-- ── COMPLAINTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaints (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number       TEXT UNIQUE NOT NULL,
    complainant_id         UUID NOT NULL REFERENCES public.profiles(id),
    complainant_email      TEXT NOT NULL,
    complainant_name       TEXT NOT NULL,
    complainant_type       TEXT NOT NULL CHECK (complainant_type IN (
                               'student','faculty','parent_guardian','institution_rep','other')),
    mobile                 TEXT,
    institution_id         UUID NOT NULL REFERENCES public.institutions(id),
    course_or_department   TEXT,
    category               TEXT NOT NULL CHECK (category IN (
                               'approval_regulatory_compliance','institution_administration',
                               'academic_grievance','student_facilities',
                               'examination_evaluation','fee_related','other')),
    subject                TEXT NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 200),
    description            TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
    date_of_incident       DATE,
    academic_year          TEXT CHECK (char_length(academic_year) <= 20),
    previous_complaint     TEXT NOT NULL DEFAULT 'no' CHECK (previous_complaint IN ('yes','no','not_sure')),
    previous_complaint_id  TEXT CHECK (char_length(previous_complaint_id) <= 50),
    status                 TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
                               'submitted','routing_completed','assigned',
                               'under_review','under_process','additional_info_required',
                               'transferred','escalated','resolved','closed')),
    assigned_bureau        TEXT CHECK (assigned_bureau IN ('RB','PGRC','triage','pending')),
    public_remarks         TEXT,
    resolution_summary     TEXT,
    idempotency_key        TEXT NOT NULL,
    expected_disposal_date DATE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_idempotency
    ON public.complaints(complainant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_complaints_complainant_id ON public.complaints(complainant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON public.complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_bureau ON public.complaints(assigned_bureau);
CREATE INDEX IF NOT EXISTS idx_complaints_institution_id ON public.complaints(institution_id);

-- ── COMPLAINT ATTACHMENTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_attachments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id   UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    filename       TEXT NOT NULL,
    storage_path   TEXT NOT NULL,
    content_type   TEXT NOT NULL,
    size_bytes     INTEGER NOT NULL CHECK (size_bytes > 0),
    uploaded_by    UUID NOT NULL REFERENCES public.profiles(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_complaint_id ON public.complaint_attachments(complaint_id);

-- ── COMPLAINT STATUS HISTORY ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id  UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    status        TEXT NOT NULL,
    note          TEXT,
    changed_by    UUID REFERENCES public.profiles(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_complaint_id
    ON public.complaint_status_history(complaint_id);

-- ── ROUTING DECISIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routing_decisions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id      UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    assigned_bureau   TEXT NOT NULL,
    confidence_score  NUMERIC(5,4),
    routing_reason    TEXT NOT NULL,
    routing_method    TEXT NOT NULL,
    ruleset_version   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_complaint_id ON public.routing_decisions(complaint_id);

-- ── BUREAU ASSIGNMENTS ────────────────────────────────────────
-- Records when an authorized officer assigns/reassigns a complaint.
CREATE TABLE IF NOT EXISTS public.bureau_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    bureau          TEXT NOT NULL CHECK (bureau IN ('RB','PGRC','triage','pending')),
    assigned_to     UUID REFERENCES public.profiles(id),
    assigned_by     UUID REFERENCES public.profiles(id),
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bureau_assignments_complaint_id
    ON public.bureau_assignments(complaint_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    complaint_id  UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
    message       TEXT NOT NULL,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- ── RELATED COMPLAINTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.related_complaints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    related_id      UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    relation_type   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_relation CHECK (complaint_id <> related_id)
);

-- ── AUDIT LOGS ────────────────────────────────────────────────
-- Stores important administrative and case-management events.
-- Keep personal information out of this table.
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id     UUID REFERENCES public.profiles(id),
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    details      JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;
CREATE TRIGGER set_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- Students can only read/write their own data.
-- Service-role key bypasses RLS (used only on the backend).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Students read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Students update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Complaints
CREATE POLICY "Students read own complaints" ON public.complaints
    FOR SELECT USING (auth.uid() = complainant_id);
CREATE POLICY "Students insert own complaints" ON public.complaints
    FOR INSERT WITH CHECK (auth.uid() = complainant_id);

-- Status history (read only for students)
CREATE POLICY "Students read own complaint history" ON public.complaint_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id AND c.complainant_id = auth.uid()
        )
    );

-- Routing decisions (read only for students)
CREATE POLICY "Students read own routing decisions" ON public.routing_decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id AND c.complainant_id = auth.uid()
        )
    );

-- Attachments
CREATE POLICY "Students read own attachments" ON public.complaint_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id AND c.complainant_id = auth.uid()
        )
    );
CREATE POLICY "Students upload own attachments" ON public.complaint_attachments
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Notifications
CREATE POLICY "Students read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Institutions (all authenticated users can read)
CREATE POLICY "Authenticated users read institutions" ON public.institutions
    FOR SELECT USING (auth.role() = 'authenticated');
