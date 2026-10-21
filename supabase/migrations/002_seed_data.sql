-- ============================================================
-- AICTE Complaint Management System — Synthetic Seed Data
-- Migration: 002_seed_data.sql
--
-- ⚠️ ALL DATA IS SYNTHETIC AND ILLUSTRATIVE.
-- These are NOT real AICTE-registered institutions.
-- Do not use these permanent IDs in any official context.
-- ============================================================

-- ── Synthetic Institution Directory ────────────────────────────
INSERT INTO public.institutions (id, permanent_id, name, state, district, address, is_synthetic)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'SYNTH-MH-001',
     'Demo Institute of Technology, Pune (Synthetic)', 'Maharashtra', 'Pune',
     '123 Demo Road, Pune - 411001', TRUE),

    ('00000000-0000-0000-0000-000000000002', 'SYNTH-DL-001',
     'Prototype College of Engineering, Delhi (Synthetic)', 'Delhi', 'New Delhi',
     '456 Sample Street, New Delhi - 110001', TRUE),

    ('00000000-0000-0000-0000-000000000003', 'SYNTH-KA-001',
     'Sample Institute of Science, Bangalore (Synthetic)', 'Karnataka', 'Bengaluru Urban',
     '789 Test Avenue, Bengaluru - 560001', TRUE),

    ('00000000-0000-0000-0000-000000000004', 'SYNTH-TN-001',
     'Illustrative College of Arts and Science, Chennai (Synthetic)', 'Tamil Nadu', 'Chennai',
     '101 Example Lane, Chennai - 600001', TRUE),

    ('00000000-0000-0000-0000-000000000005', 'SYNTH-GJ-001',
     'Placeholder Polytechnic, Ahmedabad (Synthetic)', 'Gujarat', 'Ahmedabad',
     '202 Mock Road, Ahmedabad - 380001', TRUE),

    ('00000000-0000-0000-0000-000000000006', 'SYNTH-WB-001',
     'Demonstrative Technical Institute, Kolkata (Synthetic)', 'West Bengal', 'Kolkata',
     '303 Test Path, Kolkata - 700001', TRUE),

    ('00000000-0000-0000-0000-000000000007', 'SYNTH-RJ-001',
     'Prototype Institute of Management, Jaipur (Synthetic)', 'Rajasthan', 'Jaipur',
     '404 Demo Nagar, Jaipur - 302001', TRUE),

    ('00000000-0000-0000-0000-000000000008', 'SYNTH-UP-001',
     'Sample University College, Lucknow (Synthetic)', 'Uttar Pradesh', 'Lucknow',
     '505 Illustrative Marg, Lucknow - 226001', TRUE)

ON CONFLICT (permanent_id) DO NOTHING;

-- ── Complaint Categories Reference Table ───────────────────────
-- Categories are stored in complaints.category as text for simplicity.
-- This comment serves as the authoritative reference for valid values.
-- Administrators should update the CHECK constraint to add/remove categories.
COMMENT ON COLUMN public.complaints.category IS
    'Prototype categories: approval_regulatory_compliance | institution_administration | '
    'academic_grievance | student_facilities | examination_evaluation | fee_related | other. '
    'Must be validated against official AICTE complaint categories before production use.';
