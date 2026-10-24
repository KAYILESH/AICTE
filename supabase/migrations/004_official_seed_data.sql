-- ============================================================
-- AICTE Smart Complaint Management System — Official Portal Seed
-- Migration: 004_official_seed_data.sql
--
-- ⚠️ ALL DATA IS SYNTHETIC AND ILLUSTRATIVE — SIH Demo only.
-- Official accounts are provisioned via the backend setup script.
-- This migration only seeds complaint records for the demo queue.
--
-- NOTE: auth.users entries for officials are created by the
-- setup script (scripts/seed_officials.py) using the Admin API.
-- The UUIDs below match what that script produces and must be
-- kept in sync. Do not create officials through the public API.
-- ============================================================

-- ── Demo complaint seed for RB bureau ──────────────────────────
-- Ensures the RB queue has visible cases in the demo.
-- All data is clearly synthetic.
INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at
)
SELECT
    '10000000-0000-0000-0001-000000000001',
    'AICTE-SIH-2026-00101',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student1@synthetic.aicte.in',
    'Arjun Mehta (Synthetic)',
    'student',
    '9000000001',
    '00000000-0000-0000-0000-000000000001',
    'Computer Science and Engineering',
    'approval_regulatory_compliance',
    'Faculty strength below AICTE prescribed ratio for 2026-27',
    'The institution has failed to maintain the minimum faculty-to-student ratio of 1:15 as mandated by AICTE for UG programmes. Only 8 faculty members are available against a sanctioned strength of 20, severely affecting teaching quality.',
    'no',
    'assigned',
    'RB',
    'seed-rb-case-001',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '8 days'
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0001-000000000001'
);

INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at, expected_disposal_date
)
SELECT
    '10000000-0000-0000-0001-000000000002',
    'AICTE-SIH-2026-00088',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student2@synthetic.aicte.in',
    'Priya Nair (Synthetic)',
    'student',
    '9000000002',
    '00000000-0000-0000-0000-000000000002',
    'Mechanical Engineering',
    'approval_regulatory_compliance',
    'Institution operating MBA programme without valid AICTE approval',
    'The institution is conducting an MBA programme with an intake of 120 students for the 2026-27 academic year without obtaining the mandatory AICTE extension of approval. The approval letter provided appears fraudulent upon verification.',
    'no',
    'under_review',
    'RB',
    'seed-rb-case-002',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '3 days',
    (CURRENT_DATE + INTERVAL '7 days')::DATE
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0001-000000000002'
);

INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at, expected_disposal_date
)
SELECT
    '10000000-0000-0000-0001-000000000003',
    'AICTE-SIH-2026-00075',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student3@synthetic.aicte.in',
    'Kiran Desai (Synthetic)',
    'student',
    '9000000003',
    '00000000-0000-0000-0000-000000000003',
    'Electronics & Communication',
    'institution_administration',
    'Infrastructure deficiencies: laboratories lack mandatory AICTE specifications',
    'Multiple laboratories including the VLSI lab and Embedded Systems lab do not meet AICTE minimum infrastructure requirements. Computers are outdated (pre-2019) and the licensed software required by the curriculum has not been renewed.',
    'no',
    'under_process',
    'RB',
    'seed-rb-case-003',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '5 days',
    (CURRENT_DATE - INTERVAL '3 days')::DATE
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0001-000000000003'
);

-- ── Demo complaint seed for PGRC bureau ────────────────────────

INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at
)
SELECT
    '10000000-0000-0000-0002-000000000001',
    'AICTE-SIH-2026-00112',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student4@synthetic.aicte.in',
    'Sunita Joshi (Synthetic)',
    'student',
    '9000000004',
    '00000000-0000-0000-0000-000000000004',
    'Information Technology',
    'fee_related',
    'College charging excessive capitation fee beyond AICTE-approved fee structure',
    'The college is demanding Rs. 75,000 as a "development fund" on top of the AICTE-approved tuition fee. Students who refused to pay have been threatened with withheld examination hall tickets. No receipts are being issued for this collection.',
    'no',
    'assigned',
    'PGRC',
    'seed-pgrc-case-001',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0002-000000000001'
);

INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at
)
SELECT
    '10000000-0000-0000-0002-000000000002',
    'AICTE-SIH-2026-00098',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student5@synthetic.aicte.in',
    'Ravi Kumar (Synthetic)',
    'student',
    '9000000005',
    '00000000-0000-0000-0000-000000000005',
    'Civil Engineering',
    'examination_evaluation',
    'Semester results not declared 5 months after examination — marks withheld',
    'Semester IV results for Civil Engineering batch 2023-27 have not been declared despite 5 months having elapsed since the examinations. College administration refuses to provide a timeline, citing ongoing revaluation requests.',
    'no',
    'additional_info_required',
    'PGRC',
    'seed-pgrc-case-002',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0002-000000000002'
);

INSERT INTO public.complaints (
    id, complaint_number, complainant_id, complainant_email,
    complainant_name, complainant_type, mobile, institution_id,
    course_or_department, category, subject, description,
    previous_complaint, status, assigned_bureau, idempotency_key,
    created_at, updated_at, resolution_summary
)
SELECT
    '10000000-0000-0000-0002-000000000003',
    'AICTE-SIH-2026-00061',
    (SELECT id FROM public.profiles LIMIT 1),
    'demo.student6@synthetic.aicte.in',
    'Anjali Verma (Synthetic)',
    'student',
    '9000000006',
    '00000000-0000-0000-0000-000000000006',
    'Electrical Engineering',
    'student_facilities',
    'Hostel facilities substandard — no clean drinking water, no CCTV',
    'Girls hostel has been without potable drinking water for 3 weeks due to broken water purification system. RO filters are non-functional. CCTV coverage is absent in corridors despite AICTE norms requiring it.',
    'no',
    'resolved',
    'PGRC',
    'seed-pgrc-case-003',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '8 days',
    'Institution repaired water purification system and installed CCTV coverage in all hostel corridors. Facility inspection confirmed satisfactory completion. Complainant acknowledged resolution.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.complaints WHERE id = '10000000-0000-0000-0002-000000000003'
);

-- ── Seed status history for RB cases ───────────────────────────
INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000001', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '10 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000001' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000001', 'routing_completed', 'AI rule engine routed to Regulation Bureau (RB). Category: approval_regulatory_compliance. Confidence: 0.85.', NOW() - INTERVAL '10 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000001' AND status = 'routing_completed');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000001', 'assigned', 'Assigned to RB Inspection Officer.', NOW() - INTERVAL '8 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000001' AND status = 'assigned');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000002', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000002' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000002', 'routing_completed', 'AI rule engine routed to Regulation Bureau (RB).', NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000002' AND status = 'routing_completed');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000002', 'under_review', 'RB team initiated document verification with institution registrar.', NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000002' AND status = 'under_review');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000003', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '25 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000003' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000003', 'routing_completed', 'AI rule engine routed to Regulation Bureau (RB).', NOW() - INTERVAL '25 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000003' AND status = 'routing_completed');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0001-000000000003', 'under_process', 'RB issued notice to institution for infrastructure compliance report.', NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0001-000000000003' AND status = 'under_process');

-- ── Seed status history for PGRC cases ─────────────────────────
INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000001', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000001' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000001', 'assigned', 'Assigned to PGRC Grievance Officer.', NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000001' AND status = 'assigned');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000002', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '15 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000002' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000002', 'additional_info_required', 'PGRC requested examination schedule documentation from complainant.', NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000002' AND status = 'additional_info_required');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000003', 'submitted', 'Complaint received and registered.', NOW() - INTERVAL '30 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000003' AND status = 'submitted');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000003', 'under_process', 'PGRC issued notice to institution. Repair timeline requested.', NOW() - INTERVAL '20 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000003' AND status = 'under_process');

INSERT INTO public.complaint_status_history (complaint_id, status, note, created_at)
SELECT '10000000-0000-0000-0002-000000000003', 'resolved', 'Institution confirmed facility restoration. Complainant verified resolution.', NOW() - INTERVAL '8 days'
WHERE NOT EXISTS (SELECT 1 FROM public.complaint_status_history WHERE complaint_id = '10000000-0000-0000-0002-000000000003' AND status = 'resolved');

-- ── Seed routing decisions for demo cases ──────────────────────
INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0001-000000000001', 'RB', 0.8500, 'Complaint falls under Regulation Bureau (RB) — regulatory/approval matters.', 'rule_based', '1.0.0', NOW() - INTERVAL '10 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0001-000000000001');

INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0001-000000000002', 'RB', 0.8500, 'Complaint falls under Regulation Bureau (RB) — regulatory/approval matters.', 'rule_based', '1.0.0', NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0001-000000000002');

INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0001-000000000003', 'RB', 0.6500, 'Complaint falls under Regulation Bureau (RB) — regulatory/approval matters. (category match only)', 'rule_based', '1.0.0', NOW() - INTERVAL '25 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0001-000000000003');

INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0002-000000000001', 'PGRC', 0.8500, 'Complaint falls under PGRC — student welfare matters.', 'rule_based', '1.0.0', NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0002-000000000001');

INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0002-000000000002', 'PGRC', 0.8500, 'Complaint falls under PGRC — student welfare matters.', 'rule_based', '1.0.0', NOW() - INTERVAL '15 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0002-000000000002');

INSERT INTO public.routing_decisions (complaint_id, assigned_bureau, confidence_score, routing_reason, routing_method, ruleset_version, created_at)
SELECT '10000000-0000-0000-0002-000000000003', 'PGRC', 0.8500, 'Complaint falls under PGRC — student welfare matters.', 'rule_based', '1.0.0', NOW() - INTERVAL '30 days'
WHERE NOT EXISTS (SELECT 1 FROM public.routing_decisions WHERE complaint_id = '10000000-0000-0000-0002-000000000003');
