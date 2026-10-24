/**
 * Official Portal API client for RB/PGRC officials.
 *
 * - Reads Supabase JWT from the session (never a demo token).
 * - Gracefully falls back to rich synthetic demo data when the backend
 *   is unavailable, so the UI is always demonstrable at the SIH demo.
 * - All mock data is clearly labelled as synthetic.
 * - Role-based data isolation is enforced server-side; the mock data
 *   mirrors what each bureau should see.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

// ── Types ────────────────────────────────────────────────────────

export type Bureau = 'RB' | 'PGRC' | 'ALL'

export type OfficialRole =
  | 'rb_official'
  | 'pgrc_official'
  | 'senior_official'
  | 'system_admin'

export interface OfficialProfile {
  user_id: string
  display_name: string
  designation?: string
  bureau: Bureau
  employee_id?: string
  role: OfficialRole
}

export interface OfficialDashboardStats {
  total: number
  new_unreviewed: number
  under_process: number
  additional_info: number
  transferred: number
  resolved: number
  overdue: number
}

export interface OfficialCaseSummary {
  id: string
  complaint_number: string
  institution_name: string
  institution_permanent_id: string
  complainant_name: string
  subject: string
  category: string
  status: string
  assigned_bureau?: string
  created_at: string
  updated_at: string
  expected_disposal_date?: string
  is_overdue?: boolean
}

export interface CaseStatusHistoryEntry {
  status: string
  note?: string
  created_at: string
}

export interface CaseAction {
  id: string
  action_type: string
  previous_status?: string
  new_status?: string
  previous_bureau?: string
  new_bureau?: string
  action_reason?: string
  next_action_summary?: string
  created_at: string
}

export interface CaseNote {
  id: string
  note_type: 'internal' | 'student_visible' | 'action_record'
  content: string
  author_id: string
  created_at: string
}

export interface OfficialCaseDetail {
  id: string
  complaint_number: string
  complainant_name: string
  complainant_email: string
  complainant_type: string
  mobile?: string
  institution: { id: string; permanent_id: string; name: string; state: string; district: string }
  course_or_department?: string
  category: string
  subject: string
  description: string
  date_of_incident?: string
  academic_year?: string
  previous_complaint: string
  previous_complaint_id?: string
  status: string
  assigned_bureau?: string
  assigned_officer?: string
  next_action?: string
  last_action_at?: string
  expected_disposal_date?: string
  date_assigned?: string
  date_resolved?: string
  public_remarks?: string
  resolution_summary?: string
  created_at: string
  updated_at: string
  complaint_status_history?: CaseStatusHistoryEntry[]
  routing_decisions?: Array<{
    assigned_bureau: string
    confidence_score?: number
    routing_reason: string
    routing_method: string
    ruleset_version?: string
    created_at: string
  }>
  complaint_attachments?: Array<{ id: string; filename: string; content_type: string; size_bytes: number; created_at: string }>
  case_notes?: CaseNote[]
  case_actions?: CaseAction[]
}

export interface OfficialNotification {
  id: string
  message: string
  complaint_id?: string
  is_read: boolean
  created_at: string
}

// ── Demo session helper (distinct from student demo) ──────────────

export const DEMO_RB_OFFICIAL: OfficialProfile = {
  user_id: 'demo-rb-001',
  display_name: 'Shri Rajiv Nair (Demo)',
  designation: 'Inspection Officer — Regulation Bureau',
  bureau: 'RB',
  employee_id: 'RB-DEMO-001',
  role: 'rb_official',
}

export const DEMO_PGRC_OFFICIAL: OfficialProfile = {
  user_id: 'demo-pgrc-001',
  display_name: 'Smt. Ananya Sharma (Demo)',
  designation: 'Grievance Officer — PGRC',
  bureau: 'PGRC',
  employee_id: 'PGRC-DEMO-001',
  role: 'pgrc_official',
}

const OFFICIAL_SESSION_KEY = 'aicte_official_demo_session'
const OFFICIAL_BUREAU_KEY = 'aicte_official_demo_bureau'

export function setOfficialDemoSession(bureau: Bureau, customProfile?: Partial<OfficialProfile>) {
  if (typeof window === 'undefined') return
  const baseProfile = bureau === 'RB' ? DEMO_RB_OFFICIAL : DEMO_PGRC_OFFICIAL
  const profile = customProfile ? { ...baseProfile, ...customProfile } : baseProfile
  localStorage.setItem(OFFICIAL_SESSION_KEY, JSON.stringify(profile))
  localStorage.setItem(OFFICIAL_BUREAU_KEY, bureau)
  document.cookie = `aicte_official_session=${bureau}; path=/; max-age=86400; SameSite=Lax`
  document.cookie = `aicte_official_demo=${bureau}; path=/; max-age=86400; SameSite=Lax`
}

export function clearOfficialDemoSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(OFFICIAL_SESSION_KEY)
  localStorage.removeItem(OFFICIAL_BUREAU_KEY)
  document.cookie = 'aicte_official_session=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'aicte_official_demo=; path=/; max-age=0; SameSite=Lax'
}

export function getOfficialDemoSession(): OfficialProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(OFFICIAL_SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// ── Mock data ──────────────────────────────────────────────────

const MOCK_RB_CASES: OfficialCaseDetail[] = [
  {
    id: '10000000-0000-0000-0001-000000000001',
    complaint_number: 'AICTE-SIH-2026-00101',
    complainant_name: 'Arjun Mehta (Synthetic)',
    complainant_email: 'demo.student1@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-001', permanent_id: 'SYNTH-MH-001', name: 'Demo Institute of Technology, Pune (Synthetic)', state: 'Maharashtra', district: 'Pune' },
    course_or_department: 'Computer Science and Engineering',
    category: 'approval_regulatory_compliance',
    subject: 'Faculty strength below AICTE prescribed ratio for 2026-27',
    description: 'The institution has failed to maintain the minimum faculty-to-student ratio of 1:15 as mandated by AICTE for UG programmes. Only 8 faculty members are available against a sanctioned strength of 20, severely affecting teaching quality.',
    previous_complaint: 'no',
    status: 'assigned',
    assigned_bureau: 'RB',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received and registered.', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
      { status: 'routing_completed', note: 'AI rule engine routed to RB. Confidence: 0.85.', created_at: new Date(Date.now() - 10 * 86400000 + 60000).toISOString() },
      { status: 'assigned', note: 'Assigned to RB Inspection Officer.', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'RB', confidence_score: 0.85, routing_reason: 'Complaint falls under Regulation Bureau (RB) — regulatory/approval matters.', routing_method: 'rule_based', ruleset_version: '1.0.0', created_at: new Date(Date.now() - 10 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [],
    case_actions: [],
  },
  {
    id: '10000000-0000-0000-0001-000000000002',
    complaint_number: 'AICTE-SIH-2026-00088',
    complainant_name: 'Priya Nair (Synthetic)',
    complainant_email: 'demo.student2@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-002', permanent_id: 'SYNTH-DL-001', name: 'Prototype College of Engineering, Delhi (Synthetic)', state: 'Delhi', district: 'New Delhi' },
    course_or_department: 'Mechanical Engineering',
    category: 'approval_regulatory_compliance',
    subject: 'Institution operating MBA programme without valid AICTE approval',
    description: 'The institution is conducting an MBA programme with an intake of 120 students for the 2026-27 academic year without obtaining the mandatory AICTE extension of approval.',
    previous_complaint: 'no',
    status: 'under_review',
    assigned_bureau: 'RB',
    expected_disposal_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received.', created_at: new Date(Date.now() - 18 * 86400000).toISOString() },
      { status: 'routing_completed', note: 'Routed to RB.', created_at: new Date(Date.now() - 18 * 86400000 + 60000).toISOString() },
      { status: 'under_review', note: 'RB team initiated document verification.', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'RB', confidence_score: 0.85, routing_reason: 'Regulatory compliance issue.', routing_method: 'rule_based', created_at: new Date(Date.now() - 18 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [{ id: 'note-rb-1', note_type: 'internal', content: 'Requested approval documentation from institution registrar on 21-Oct-2026.', author_id: 'demo-rb-001', created_at: new Date(Date.now() - 3 * 86400000).toISOString() }],
    case_actions: [{ id: 'act-rb-1', action_type: 'status_change', previous_status: 'assigned', new_status: 'under_review', action_reason: 'RB team initiated document verification.', created_at: new Date(Date.now() - 3 * 86400000).toISOString() }],
  },
  {
    id: '10000000-0000-0000-0001-000000000003',
    complaint_number: 'AICTE-SIH-2026-00075',
    complainant_name: 'Kiran Desai (Synthetic)',
    complainant_email: 'demo.student3@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-003', permanent_id: 'SYNTH-KA-001', name: 'Sample Institute of Science, Bangalore (Synthetic)', state: 'Karnataka', district: 'Bengaluru Urban' },
    course_or_department: 'Electronics & Communication',
    category: 'institution_administration',
    subject: 'Infrastructure deficiencies: laboratories lack mandatory AICTE specifications',
    description: 'Multiple laboratories including the VLSI lab and Embedded Systems lab do not meet AICTE minimum infrastructure requirements. Computers are outdated (pre-2019).',
    previous_complaint: 'no',
    status: 'under_process',
    assigned_bureau: 'RB',
    expected_disposal_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    is_overdue: true,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received.', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
      { status: 'routing_completed', note: 'Routed to RB.', created_at: new Date(Date.now() - 25 * 86400000 + 60000).toISOString() },
      { status: 'under_process', note: 'RB issued notice to institution for infrastructure compliance report.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'RB', confidence_score: 0.65, routing_reason: 'Institution administration compliance issue.', routing_method: 'rule_based', created_at: new Date(Date.now() - 25 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [],
    case_actions: [{ id: 'act-rb-2', action_type: 'status_change', previous_status: 'assigned', new_status: 'under_process', action_reason: 'RB issued compliance notice to institution.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() }],
  },
]

const MOCK_PGRC_CASES: OfficialCaseDetail[] = [
  {
    id: '10000000-0000-0000-0002-000000000001',
    complaint_number: 'AICTE-SIH-2026-00112',
    complainant_name: 'Sunita Joshi (Synthetic)',
    complainant_email: 'demo.student4@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-004', permanent_id: 'SYNTH-UP-001', name: 'Sample University College, Lucknow (Synthetic)', state: 'Uttar Pradesh', district: 'Lucknow' },
    course_or_department: 'Information Technology',
    category: 'fee_related',
    subject: 'College charging excessive capitation fee beyond AICTE-approved fee structure',
    description: 'The college is demanding Rs. 75,000 as a "development fund" on top of the AICTE-approved tuition fee. Students who refused to pay have been threatened with withheld examination hall tickets.',
    previous_complaint: 'no',
    status: 'assigned',
    assigned_bureau: 'PGRC',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received.', created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
      { status: 'assigned', note: 'Assigned to PGRC Grievance Officer.', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'PGRC', confidence_score: 0.85, routing_reason: 'Fee-related grievance assigned to PGRC.', routing_method: 'rule_based', created_at: new Date(Date.now() - 7 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [],
    case_actions: [],
  },
  {
    id: '10000000-0000-0000-0002-000000000002',
    complaint_number: 'AICTE-SIH-2026-00098',
    complainant_name: 'Ravi Kumar (Synthetic)',
    complainant_email: 'demo.student5@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-005', permanent_id: 'SYNTH-GJ-001', name: 'Placeholder Polytechnic, Ahmedabad (Synthetic)', state: 'Gujarat', district: 'Ahmedabad' },
    course_or_department: 'Civil Engineering',
    category: 'examination_evaluation',
    subject: 'Semester results not declared 5 months after examination — marks withheld',
    description: 'Semester IV results for Civil Engineering batch 2023-27 have not been declared despite 5 months having elapsed since the examinations.',
    previous_complaint: 'no',
    status: 'additional_info_required',
    assigned_bureau: 'PGRC',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received.', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
      { status: 'additional_info_required', note: 'PGRC requested examination schedule documentation.', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'PGRC', confidence_score: 0.85, routing_reason: 'Examination grievance assigned to PGRC.', routing_method: 'rule_based', created_at: new Date(Date.now() - 15 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [{ id: 'note-pgrc-1', note_type: 'internal', content: 'Student needs to provide: 1. Examination timetable 2. Admit card copy 3. Previous result card (Sem III).', author_id: 'demo-pgrc-001', created_at: new Date(Date.now() - 2 * 86400000).toISOString() }],
    case_actions: [{ id: 'act-pgrc-1', action_type: 'additional_info_requested', previous_status: 'assigned', new_status: 'additional_info_required', action_reason: 'Additional documentation needed.', created_at: new Date(Date.now() - 2 * 86400000).toISOString() }],
  },
  {
    id: '10000000-0000-0000-0002-000000000003',
    complaint_number: 'AICTE-SIH-2026-00061',
    complainant_name: 'Anjali Verma (Synthetic)',
    complainant_email: 'demo.student6@synthetic.aicte.in',
    complainant_type: 'student',
    institution: { id: 'inst-006', permanent_id: 'SYNTH-WB-001', name: 'Demonstrative Technical Institute, Kolkata (Synthetic)', state: 'West Bengal', district: 'Kolkata' },
    course_or_department: 'Electrical Engineering',
    category: 'student_facilities',
    subject: 'Hostel facilities substandard — no clean drinking water, no CCTV',
    description: 'Girls hostel has been without potable drinking water for 3 weeks due to broken water purification system.',
    previous_complaint: 'no',
    status: 'resolved',
    assigned_bureau: 'PGRC',
    resolution_summary: 'Institution repaired water purification system and installed CCTV in all hostel corridors.',
    date_resolved: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    complaint_status_history: [
      { status: 'submitted', note: 'Complaint received.', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
      { status: 'under_process', note: 'PGRC issued notice to institution.', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
      { status: 'resolved', note: 'Institution confirmed facility restoration.', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
    ],
    routing_decisions: [{ assigned_bureau: 'PGRC', confidence_score: 0.85, routing_reason: 'Student facility grievance assigned to PGRC.', routing_method: 'rule_based', created_at: new Date(Date.now() - 30 * 86400000 + 60000).toISOString() }],
    complaint_attachments: [],
    case_notes: [],
    case_actions: [{ id: 'act-pgrc-2', action_type: 'resolution', previous_status: 'under_process', new_status: 'resolved', action_reason: 'Facility restored and verified.', created_at: new Date(Date.now() - 8 * 86400000).toISOString() }],
  },
]

function getCasesForBureau(bureau: Bureau): OfficialCaseDetail[] {
  if (bureau === 'RB') return MOCK_RB_CASES
  if (bureau === 'PGRC') return MOCK_PGRC_CASES
  return [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
}

// ── API fetch helper ───────────────────────────────────────────

async function getOfficialToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    // Reject demo tokens from the student portal
    if (token === 'demo-jwt-token') return null
    return token ?? null
  } catch {
    return null
  }
}

async function officialFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getOfficialToken()
  if (!token) {
    throw new Error('NO_TOKEN')
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  })
  if (!res.ok) {
    let detail = `API error ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch {}
    throw new Error(detail)
  }
  return (await res.json()) as T
}

// ── Official API functions ─────────────────────────────────────

export async function getOfficialProfile(): Promise<OfficialProfile> {
  try {
    return await officialFetch<OfficialProfile>('/official/me')
  } catch {
    const demo = getOfficialDemoSession()
    if (demo) return demo
    return DEMO_RB_OFFICIAL
  }
}

export async function getOfficialDashboardStats(bureau: Bureau): Promise<OfficialDashboardStats> {
  try {
    return await officialFetch<OfficialDashboardStats>('/official/dashboard')
  } catch {
    const cases = getCasesForBureau(bureau)
    const today = new Date().toISOString().split('T')[0]
    const statuses = cases.map(c => c.status)
    const overdue = cases.filter(c =>
      c.expected_disposal_date && c.expected_disposal_date < today &&
      !['resolved', 'closed'].includes(c.status)
    ).length
    return {
      total: cases.length,
      new_unreviewed: statuses.filter(s => ['submitted', 'routing_completed', 'assigned'].includes(s)).length,
      under_process: statuses.filter(s => ['under_review', 'under_process'].includes(s)).length,
      additional_info: statuses.filter(s => s === 'additional_info_required').length,
      transferred: statuses.filter(s => ['transferred', 'escalated'].includes(s)).length,
      resolved: statuses.filter(s => ['resolved', 'closed'].includes(s)).length,
      overdue,
    }
  }
}

export async function getOfficialCases(params: {
  bureau: Bureau
  status?: string
  search?: string
  category?: string
  overdue_only?: boolean
  sort?: string
  page?: number
  page_size?: number
}): Promise<{ total: number; page: number; page_size: number; items: OfficialCaseSummary[] }> {
  try {
    const qs = new URLSearchParams()
    if (params.status && params.status !== 'all') qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    if (params.category && params.category !== 'all') qs.set('category', params.category)
    if (params.overdue_only) qs.set('overdue_only', 'true')
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.page_size) qs.set('page_size', String(params.page_size))
    return await officialFetch(`/official/cases?${qs}`)
  } catch {
    let filtered = getCasesForBureau(params.bureau)
    const today = new Date().toISOString().split('T')[0]
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(c => c.status === params.status)
    }
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter(c => c.category === params.category)
    }
    if (params.overdue_only) {
      filtered = filtered.filter(c =>
        c.expected_disposal_date && c.expected_disposal_date < today &&
        !['resolved', 'closed'].includes(c.status)
      )
    }
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(c =>
        c.complaint_number.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.institution.name.toLowerCase().includes(q) ||
        c.complainant_name.toLowerCase().includes(q)
      )
    }
    const summaries: OfficialCaseSummary[] = filtered.map(c => ({
      id: c.id,
      complaint_number: c.complaint_number,
      institution_name: c.institution.name,
      institution_permanent_id: c.institution.permanent_id,
      complainant_name: c.complainant_name,
      subject: c.subject,
      category: c.category,
      status: c.status,
      assigned_bureau: c.assigned_bureau,
      created_at: c.created_at,
      updated_at: c.updated_at,
      expected_disposal_date: c.expected_disposal_date,
      is_overdue: c.is_overdue || (
        !!c.expected_disposal_date &&
        c.expected_disposal_date < today &&
        !['resolved', 'closed'].includes(c.status)
      ),
    }))
    return {
      total: summaries.length,
      page: params.page || 1,
      page_size: params.page_size || 15,
      items: summaries,
    }
  }
}

export async function getOfficialCaseDetail(caseId: string): Promise<OfficialCaseDetail> {
  try {
    return await officialFetch<OfficialCaseDetail>(`/official/cases/${caseId}`)
  } catch {
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const found = allCases.find(c => c.id === caseId || c.complaint_number === caseId)
    if (found) return found
    return MOCK_RB_CASES[0]
  }
}

export async function updateCaseStatus(caseId: string, payload: {
  new_status: string
  action_reason: string
  note_for_student?: string
  internal_note?: string
  next_action?: string
  expected_disposal_date?: string
}): Promise<{ success: boolean; new_status: string }> {
  try {
    return await officialFetch(`/official/cases/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  } catch {
    // Demo mode: mutate in-memory
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const c = allCases.find(x => x.id === caseId)
    if (c) {
      c.status = payload.new_status
      c.updated_at = new Date().toISOString()
      c.complaint_status_history?.push({
        status: payload.new_status,
        note: payload.action_reason,
        created_at: new Date().toISOString(),
      })
    }
    return { success: true, new_status: payload.new_status }
  }
}

export async function addCaseNote(caseId: string, payload: {
  content: string
  note_type: 'internal' | 'student_visible'
}): Promise<{ success: boolean; note_id: string }> {
  try {
    return await officialFetch(`/official/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    const noteId = `note-demo-${Date.now()}`
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const c = allCases.find(x => x.id === caseId)
    if (c && c.case_notes) {
      c.case_notes.push({
        id: noteId,
        note_type: payload.note_type,
        content: payload.content,
        author_id: 'demo-official',
        created_at: new Date().toISOString(),
      })
    }
    return { success: true, note_id: noteId }
  }
}

export async function transferCase(caseId: string, payload: {
  target_bureau: string
  reason: string
}): Promise<{ success: boolean; new_bureau: string }> {
  try {
    return await officialFetch(`/official/cases/${caseId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const c = allCases.find(x => x.id === caseId)
    if (c) {
      c.assigned_bureau = payload.target_bureau
      c.status = 'transferred'
      c.updated_at = new Date().toISOString()
    }
    return { success: true, new_bureau: payload.target_bureau }
  }
}

export async function escalateCase(caseId: string, payload: {
  reason: string
  internal_note?: string
}): Promise<{ success: boolean; new_status: string }> {
  try {
    return await officialFetch(`/official/cases/${caseId}/escalate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const c = allCases.find(x => x.id === caseId)
    if (c) c.status = 'escalated'
    return { success: true, new_status: 'escalated' }
  }
}

export async function resolveCase(caseId: string, payload: {
  resolution_summary: string
  internal_note?: string
}): Promise<{ success: boolean; new_status: string }> {
  try {
    return await officialFetch(`/official/cases/${caseId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    const allCases = [...MOCK_RB_CASES, ...MOCK_PGRC_CASES]
    const c = allCases.find(x => x.id === caseId)
    if (c) {
      c.status = 'resolved'
      c.resolution_summary = payload.resolution_summary
      c.date_resolved = new Date().toISOString()
    }
    return { success: true, new_status: 'resolved' }
  }
}

export async function getOfficialNotifications(bureau: Bureau): Promise<OfficialNotification[]> {
  try {
    const data = await officialFetch<{ notifications: OfficialNotification[] }>('/official/notifications')
    return data.notifications
  } catch {
    const cases = getCasesForBureau(bureau)
    const today = new Date().toISOString().split('T')[0]
    const notifs: OfficialNotification[] = []
    cases.forEach(c => {
      if (c.status === 'assigned') {
        notifs.push({ id: `n-${c.id}-assigned`, message: `Case ${c.complaint_number} is assigned and awaiting review.`, complaint_id: c.id, is_read: false, created_at: c.updated_at })
      }
      if (c.is_overdue || (c.expected_disposal_date && c.expected_disposal_date < today && !['resolved','closed'].includes(c.status))) {
        notifs.push({ id: `n-${c.id}-overdue`, message: `⚠️ Case ${c.complaint_number} is OVERDUE. Expected disposal: ${c.expected_disposal_date}.`, complaint_id: c.id, is_read: false, created_at: c.updated_at })
      }
    })
    return notifs
  }
}
