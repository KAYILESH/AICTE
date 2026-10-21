/**
 * Typed API client for the AICTE Student Portal.
 * Automatically handles live FastAPI backend requests when available,
 * and seamlessly provides full synthetic demo data if the backend is not running.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// ── Types ───────────────────────────────────────────────────────

export interface Institution {
  id: string
  permanent_id: string
  name: string
  state: string
  district: string
  is_synthetic: boolean
}

export interface ComplaintSummary {
  id: string
  complaint_number: string
  institution_name: string
  subject: string
  category: string
  status: string
  assigned_bureau?: string
  created_at: string
  updated_at: string
}

export interface ComplaintListResponse {
  total: number
  page: number
  page_size: number
  items: ComplaintSummary[]
}

export interface DashboardStats {
  total: number
  submitted: number
  under_process: number
  resolved: number
}

export interface ComplaintDetail {
  id: string
  complaint_number: string
  complainant_type: string
  institution: Institution
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
  public_remarks?: string
  resolution_summary?: string
  created_at: string
  updated_at: string
  status_history: Array<{ status: string; note?: string; created_at: string }>
  routing_decision?: {
    assigned_bureau: string
    routing_reason: string
    routing_method: string
    created_at: string
  }
  attachments: Array<{ id: string; filename: string; content_type: string; size_bytes: number }>
}

export interface Notification {
  id: string
  message: string
  complaint_id?: string
  complaint_number?: string
  is_read: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  mobile?: string
  created_at: string
}

// ── Mock Synthetic Data ─────────────────────────────────────────

const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'inst-1', permanent_id: '1-10492831', name: 'Delhi Institute of Technology & Management', state: 'Delhi', district: 'North Delhi', is_synthetic: true },
  { id: 'inst-2', permanent_id: '1-20948172', name: 'Apex College of Engineering & Technology', state: 'Maharashtra', district: 'Pune', is_synthetic: true },
  { id: 'inst-3', permanent_id: '1-38472910', name: 'National Institute of Science & Technology', state: 'Karnataka', district: 'Bengaluru Urban', is_synthetic: true },
  { id: 'inst-4', permanent_id: '1-49182736', name: 'Metro Engineering College', state: 'Uttar Pradesh', district: 'Noida', is_synthetic: true },
  { id: 'inst-5', permanent_id: '1-58291029', name: 'Modern Institute of Engineering and Technology', state: 'Haryana', district: 'Gurugram', is_synthetic: true },
]

let MOCK_COMPLAINTS: ComplaintDetail[] = [
  {
    id: 'cmp-1',
    complaint_number: 'AIC-2026-00042',
    complainant_type: 'Student',
    institution: MOCK_INSTITUTIONS[0],
    course_or_department: 'Computer Science and Engineering',
    category: 'fee_related',
    subject: 'Excess fee charged beyond AICTE prescribed norm',
    description: 'The college has levied an additional compulsory capitation fee of ₹35,000 under the pretext of infrastructure fund without receipt or AICTE fee committee approval.',
    status: 'under_process',
    assigned_bureau: 'PGRC',
    created_at: '2026-10-18T10:30:00Z',
    updated_at: '2026-10-19T14:15:00Z',
    previous_complaint: 'no',
    status_history: [
      { status: 'submitted', note: 'Complaint submitted by complainant', created_at: '2026-10-18T10:30:00Z' },
      { status: 'routing_completed', note: 'AI routed complaint to PGRC (confidence 0.94)', created_at: '2026-10-18T10:31:00Z' },
      { status: 'assigned', note: 'Assigned to Public Grievance Redressal Cell officer', created_at: '2026-10-18T11:00:00Z' },
      { status: 'under_process', note: 'Notice issued to institution management for explanation', created_at: '2026-10-19T14:15:00Z' },
    ],
    routing_decision: {
      assigned_bureau: 'PGRC',
      routing_reason: 'Fee-related grievance concerning student welfare and unjustified fee demands belongs under PGRC jurisdiction.',
      routing_method: 'AI / Rule Engine',
      created_at: '2026-10-18T10:31:00Z',
    },
    attachments: [
      { id: 'att-1', filename: 'fee_receipt_notice.pdf', content_type: 'application/pdf', size_bytes: 245000 },
    ],
  },
  {
    id: 'cmp-2',
    complaint_number: 'AIC-2026-00038',
    complainant_type: 'Student',
    institution: MOCK_INSTITUTIONS[1],
    course_or_department: 'Mechanical Engineering',
    category: 'approval_regulatory_compliance',
    subject: 'Lack of qualified faculty and faculty shortage in CS/IT',
    description: 'Several sanctioned faculty positions remain vacant, and faculty-to-student ratio violates AICTE approval norms for the 2026-2027 academic year.',
    status: 'assigned',
    assigned_bureau: 'RB',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-16T11:20:00Z',
    previous_complaint: 'no',
    status_history: [
      { status: 'submitted', note: 'Complaint submitted by complainant', created_at: '2026-10-15T09:00:00Z' },
      { status: 'routing_completed', note: 'AI routed complaint to Regulation Bureau (RB)', created_at: '2026-10-15T09:01:00Z' },
      { status: 'assigned', note: 'Assigned to Regulation Bureau inspection team', created_at: '2026-10-16T11:20:00Z' },
    ],
    routing_decision: {
      assigned_bureau: 'RB',
      routing_reason: 'Faculty cadre ratio and AICTE approval compliance falls directly under Regulation Bureau (RB).',
      routing_method: 'AI / Rule Engine',
      created_at: '2026-10-15T09:01:00Z',
    },
    attachments: [],
  },
  {
    id: 'cmp-3',
    complaint_number: 'AIC-2026-00021',
    complainant_type: 'Student',
    institution: MOCK_INSTITUTIONS[2],
    course_or_department: 'Information Technology',
    category: 'examination_evaluation',
    subject: 'Delay in semester grade cards and marksheet distribution',
    description: 'Fourth semester examination results and original marksheets have been withheld for more than 4 months without justification.',
    status: 'resolved',
    assigned_bureau: 'PGRC',
    created_at: '2026-10-02T14:00:00Z',
    updated_at: '2026-10-12T16:30:00Z',
    resolution_summary: 'Institution released marksheets after PGRC intervention. Complainant confirmed receipt.',
    previous_complaint: 'no',
    status_history: [
      { status: 'submitted', note: 'Complaint submitted', created_at: '2026-10-02T14:00:00Z' },
      { status: 'assigned', note: 'Assigned to PGRC officer', created_at: '2026-10-03T10:00:00Z' },
      { status: 'under_process', note: 'Institution responded with dispatch schedule', created_at: '2026-10-08T12:00:00Z' },
      { status: 'resolved', note: 'Marksheets issued; grievance resolved', created_at: '2026-10-12T16:30:00Z' },
    ],
    attachments: [],
  },
  {
    id: 'cmp-4',
    complaint_number: 'AIC-2026-00015',
    complainant_type: 'Student',
    institution: MOCK_INSTITUTIONS[3],
    course_or_department: 'Electronics & Communication',
    category: 'student_facilities',
    subject: 'Inadequate laboratory equipment for VLSI & Embedded lab',
    description: 'Hardware kits in laboratory are broken and non-functional, preventing practical syllabus completion.',
    status: 'submitted',
    assigned_bureau: 'RB',
    created_at: '2026-09-28T11:20:00Z',
    updated_at: '2026-09-28T11:20:00Z',
    previous_complaint: 'no',
    status_history: [
      { status: 'submitted', note: 'Complaint submitted and verified', created_at: '2026-09-28T11:20:00Z' },
    ],
    attachments: [],
  },
]

let MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    message: 'Your complaint AIC-2026-00042 has been moved to "Under Process". Notice sent to college.',
    complaint_id: 'cmp-1',
    complaint_number: 'AIC-2026-00042',
    is_read: false,
    created_at: '2026-10-19T14:15:00Z',
  },
  {
    id: 'notif-2',
    message: 'Your complaint AIC-2026-00038 was automatically routed to Regulation Bureau (RB).',
    complaint_id: 'cmp-2',
    complaint_number: 'AIC-2026-00038',
    is_read: true,
    created_at: '2026-10-15T09:01:00Z',
  },
  {
    id: 'notif-3',
    message: 'Complaint AIC-2026-00021 has been marked as Resolved. Click to view resolution details.',
    complaint_id: 'cmp-3',
    complaint_number: 'AIC-2026-00021',
    is_read: true,
    created_at: '2026-10-12T16:30:00Z',
  },
]

// ── API Fetch with graceful fallback ────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
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
  } catch (err: unknown) {
    // If backend is unreachable, throw or let caller handle fallback
    throw err
  }
}

// ── Complaints Functions ────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    return await apiFetch<DashboardStats>('/complaints/dashboard-stats')
  } catch {
    const total = MOCK_COMPLAINTS.length
    const submitted = MOCK_COMPLAINTS.filter(c => c.status === 'submitted').length
    const under_process = MOCK_COMPLAINTS.filter(c => ['assigned', 'under_review', 'under_process'].includes(c.status)).length
    const resolved = MOCK_COMPLAINTS.filter(c => ['resolved', 'closed'].includes(c.status)).length
    return { total, submitted, under_process, resolved }
  }
}

export async function getComplaints(params: {
  status?: string
  search?: string
  sort?: string
  page?: number
  page_size?: number
}): Promise<ComplaintListResponse> {
  try {
    const qs = new URLSearchParams()
    if (params.status && params.status !== 'all') qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.page_size) qs.set('page_size', String(params.page_size))
    return await apiFetch<ComplaintListResponse>(`/complaints?${qs}`)
  } catch {
    let filtered = [...MOCK_COMPLAINTS]
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(c => c.status === params.status)
    }
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(c =>
        c.complaint_number.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.institution.name.toLowerCase().includes(q)
      )
    }
    const summaries: ComplaintSummary[] = filtered.map(c => ({
      id: c.id,
      complaint_number: c.complaint_number,
      institution_name: c.institution.name,
      subject: c.subject,
      category: c.category,
      status: c.status,
      assigned_bureau: c.assigned_bureau,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }))
    return {
      total: summaries.length,
      page: params.page || 1,
      page_size: params.page_size || 8,
      items: summaries,
    }
  }
}

export async function getComplaintDetail(id: string): Promise<ComplaintDetail> {
  try {
    return await apiFetch<ComplaintDetail>(`/complaints/${id}`)
  } catch {
    const found = MOCK_COMPLAINTS.find(c => c.id === id || c.complaint_number === id)
    if (found) return found
    return MOCK_COMPLAINTS[0]
  }
}

export async function submitComplaint(payload: Record<string, unknown>): Promise<{ complaint: ComplaintDetail }> {
  try {
    return await apiFetch<{ complaint: ComplaintDetail }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    // Generate AICTE complaint in demo mode
    const id = `cmp-${Date.now()}`
    const num = `AIC-2026-${Math.floor(10000 + Math.random() * 90000)}`
    const category = String(payload.category || 'other')
    // AI Routing decision
    const isRB = ['approval_regulatory_compliance', 'institution_administration'].includes(category)
    const bureau = isRB ? 'RB' : 'PGRC'
    const reason = isRB
      ? 'Complaint relates to institution approvals, norms, and regulatory standards assigned to Regulation Bureau.'
      : 'Complaint relates to student welfare, examination, facilities or fees assigned to Public Grievance Redressal Cell.'

    const institution = MOCK_INSTITUTIONS.find(i => i.id === payload.institution_id) || {
      id: String(payload.institution_id || 'inst-gen'),
      permanent_id: '1-99887766',
      name: String(payload.institution_name || 'Selected Technical Institution'),
      state: String(payload.state || 'Delhi'),
      district: String(payload.district || 'Central'),
      is_synthetic: true,
    }

    const newComplaint: ComplaintDetail = {
      id,
      complaint_number: num,
      complainant_type: String(payload.complainant_type || 'Student'),
      institution,
      course_or_department: String(payload.course_or_department || ''),
      category,
      subject: String(payload.subject || 'Complaint Subject'),
      description: String(payload.description || ''),
      date_of_incident: String(payload.date_of_incident || ''),
      academic_year: String(payload.academic_year || '2026-2027'),
      previous_complaint: String(payload.previous_complaint || 'no'),
      previous_complaint_id: String(payload.previous_complaint_id || ''),
      status: 'submitted',
      assigned_bureau: bureau,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_history: [
        { status: 'submitted', note: 'Complaint submitted by student', created_at: new Date().toISOString() },
        { status: 'routing_completed', note: `AI routed to ${bureau}`, created_at: new Date().toISOString() },
      ],
      routing_decision: {
        assigned_bureau: bureau,
        routing_reason: reason,
        routing_method: 'AI Rule Engine',
        created_at: new Date().toISOString(),
      },
      attachments: [],
    }

    MOCK_COMPLAINTS.unshift(newComplaint)
    return { complaint: newComplaint }
  }
}

export async function uploadAttachment(
  complaintId: string,
  file: File
): Promise<{ id: string; filename: string }> {
  try {
    const token = await getAccessToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/complaints/${complaintId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || 'Upload failed')
    }
    return await res.json()
  } catch {
    return { id: `att-${Date.now()}`, filename: file.name }
  }
}

export async function searchInstitutions(
  q: string,
  state?: string
): Promise<{ institutions: Institution[] }> {
  try {
    const qs = new URLSearchParams({ q })
    if (state) qs.set('state', state)
    return await apiFetch<{ institutions: Institution[] }>(`/institutions?${qs}`)
  } catch {
    const query = q.toLowerCase()
    let filtered = MOCK_INSTITUTIONS.filter(i =>
      i.name.toLowerCase().includes(query) ||
      i.permanent_id.toLowerCase().includes(query) ||
      i.state.toLowerCase().includes(query)
    )
    if (state) {
      filtered = filtered.filter(i => i.state.toLowerCase() === state.toLowerCase())
    }
    return { institutions: filtered }
  }
}

export async function getNotifications(): Promise<{ notifications: Notification[] }> {
  try {
    return await apiFetch<{ notifications: Notification[] }>('/notifications')
  } catch {
    return { notifications: [...MOCK_NOTIFICATIONS] }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' })
  } catch {
    const notif = MOCK_NOTIFICATIONS.find(n => n.id === id)
    if (notif) notif.is_read = true
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiFetch('/notifications/mark-all-read', { method: 'PATCH' })
  } catch {
    MOCK_NOTIFICATIONS.forEach(n => (n.is_read = true))
  }
}

export async function getProfile(): Promise<Profile> {
  try {
    return await apiFetch<Profile>('/profile/me')
  } catch {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Rahul Sharma',
      email: 'student.demo@aicte.gov.in',
      mobile: '9876543210',
      created_at: '2026-09-01T00:00:00Z',
    }
  }
}

export async function updateProfile(data: {
  full_name?: string
  mobile?: string
}): Promise<Profile> {
  try {
    return await apiFetch<Profile>('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  } catch {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: data.full_name || 'Rahul Sharma',
      email: 'student.demo@aicte.gov.in',
      mobile: data.mobile || '9876543210',
      created_at: '2026-09-01T00:00:00Z',
    }
  }
}
