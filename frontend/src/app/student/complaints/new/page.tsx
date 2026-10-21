'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { searchInstitutions, submitComplaint, uploadAttachment, type Institution } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'
import {
  CheckCircle, AlertCircle, Upload, X, FileText,
  Search, Info, Shield, ArrowRight, ArrowLeft, ChevronDown
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS = ['Complainant', 'Institution', 'Complaint Details', 'Declaration & Review']

const COMPLAINANT_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'parent_guardian', label: 'Parent / Guardian' },
  { value: 'institution_rep', label: 'Institution Representative' },
  { value: 'other', label: 'Other' },
]

const CATEGORIES = [
  { value: 'approval_regulatory_compliance', label: 'Approval or Regulatory Compliance' },
  { value: 'institution_administration', label: 'Institution Administration' },
  { value: 'academic_grievance', label: 'Academic-Related Grievance' },
  { value: 'student_facilities', label: 'Student Facilities' },
  { value: 'examination_evaluation', label: 'Examination or Evaluation Grievance' },
  { value: 'fee_related', label: 'Fee-Related Grievance' },
  { value: 'other', label: 'Other' },
]

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_FILE_MB = 5
const MAX_FILES = 3

// ── Types ──────────────────────────────────────────────────────────────────

interface FormState {
  // A
  complainantType: string
  mobile: string
  // B
  institutionId: string
  institutionName: string
  institutionState: string
  institutionDistrict: string
  institutionPermanentId: string
  courseOrDept: string
  institutionNotFound: boolean
  // C
  category: string
  subject: string
  description: string
  dateOfIncident: string
  academicYear: string
  previousComplaint: string
  previousComplaintId: string
  // D
  declarationAccepted: boolean
}

interface FileItem {
  file: File
  id: string
  error?: string
}

// ── Progress Stepper ───────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '2rem', padding: '0 0.5rem' }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', flex: 1, alignItems: 'flex-start', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700, transition: 'all 0.2s',
              background: i < current ? 'var(--color-teal)' : i === current ? 'var(--color-navy)' : 'var(--color-border)',
              color: i <= current ? 'white' : 'var(--color-text-muted)',
              border: i === current ? '2px solid var(--color-navy)' : 'none',
            }}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: i < current ? 'var(--color-teal)' : 'var(--color-border)', transition: 'background 0.3s', margin: '0 0.25rem' }} />
            )}
          </div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, marginTop: '0.375rem', color: i === current ? 'var(--color-navy)' : i < current ? 'var(--color-teal)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Institution Search ─────────────────────────────────────────────────────

function InstitutionSearch({ onSelect }: { onSelect: (inst: Institution | null) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Institution[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Institution | null>(null)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const { institutions } = await searchInstitutions(query)
      setResults(institutions)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value)
    setSelected(null)
    onSelect(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(e.target.value), 350)
  }

  const handleSelect = (inst: Institution) => {
    setSelected(inst)
    setQ(inst.name)
    setOpen(false)
    onSelect(inst)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Type institution name or Permanent ID…"
          value={q}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ paddingLeft: '2.25rem' }}
          id="institution-search-input"
          autoComplete="off"
        />
        {loading && <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}><span className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} /></div>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 0.25rem)', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: '16rem', overflowY: 'auto' }}>
          {results.map(inst => (
            <button key={inst.id} type="button"
              onClick={() => handleSelect(inst)}
              style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0.625rem 0.875rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              id={`inst-option-${inst.id}`}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{inst.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {inst.permanent_id} · {inst.district}, {inst.state}
                {inst.is_synthetic && <span style={{ color: '#f59e0b', marginLeft: '0.375rem' }}>⚠ Synthetic demo</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="alert alert-info" style={{ marginTop: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem' }}>
          <CheckCircle size={13} style={{ flexShrink: 0 }} />
          <span>Selected: <strong>{selected.name}</strong> · {selected.permanent_id}</span>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function NewComplaintPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [userInfo, setUserInfo] = useState({ email: '', name: '' })
  const [form, setForm] = useState<FormState>({
    complainantType: 'student', mobile: '',
    institutionId: '', institutionName: '', institutionState: '', institutionDistrict: '',
    institutionPermanentId: '', courseOrDept: '', institutionNotFound: false,
    category: '', subject: '', description: '', dateOfIncident: '',
    academicYear: '', previousComplaint: 'no', previousComplaintId: '',
    declarationAccepted: false,
  })
  const [files, setFiles] = useState<FileItem[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'files' | 'institution', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState<{ id: string; complaint_number: string } | null>(null)
  const idempotencyKey = useRef(uuidv4())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserInfo({ email: data.user.email || '', name: data.user.user_metadata?.full_name || '' })
    })
  }, [router])

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const newItems: FileItem[] = []
    for (const file of selected) {
      if (files.length + newItems.length >= MAX_FILES) break
      const id = uuidv4()
      let error = ''
      if (!ALLOWED_TYPES.includes(file.type)) error = 'File type not allowed (PDF, PNG, JPEG only).'
      else if (file.size > MAX_FILE_MB * 1024 * 1024) error = `File exceeds ${MAX_FILE_MB} MB limit.`
      newItems.push({ file, id, error: error || undefined })
    }
    setFiles(f => [...f, ...newItems])
    e.target.value = ''
  }

  const removeFile = (id: string) => setFiles(f => f.filter(fi => fi.id !== id))

  // ── Validation per step ──────────────────────────────────────────────────

  const validateStep = (s: number) => {
    const errs: typeof errors = {}
    if (s === 0) {
      if (!form.complainantType) errs.complainantType = 'Complainant type is required.'
    }
    if (s === 1) {
      if (!form.institutionId && !form.institutionNotFound) errs.institution = 'Select an institution or mark it as not found.'
    }
    if (s === 2) {
      if (!form.category) errs.category = 'Please select a category.'
      if (!form.subject.trim() || form.subject.trim().length < 5) errs.subject = 'Subject must be at least 5 characters.'
      if (!form.description.trim() || form.description.trim().length < 20) errs.description = 'Description must be at least 20 characters.'
      const badFile = files.find(f => f.error)
      if (badFile) errs.files = badFile.error
    }
    if (s === 3) {
      if (!form.declarationAccepted) errs.declarationAccepted = 'You must accept the declaration before submitting.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) setStep(s => s + 1)
  }
  const prevStep = () => setStep(s => Math.max(0, s - 1))

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        complainant_type: form.complainantType,
        mobile: form.mobile || undefined,
        institution_id: form.institutionId,
        course_or_department: form.courseOrDept || undefined,
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        date_of_incident: form.dateOfIncident || undefined,
        academic_year: form.academicYear || undefined,
        previous_complaint: form.previousComplaint,
        previous_complaint_id: form.previousComplaintId || undefined,
        declaration_accepted: true,
        idempotency_key: idempotencyKey.current,
      }
      const result = await submitComplaint(payload)
      const createdComplaint = result.complaint

      // Upload attachments
      const validFiles = files.filter(f => !f.error)
      await Promise.allSettled(
        validFiles.map(f => uploadAttachment(createdComplaint.id, f.file))
      )

      setSubmitted({ id: createdComplaint.id, complaint_number: createdComplaint.complaint_number })
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '34rem', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '5rem', height: '5rem', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} style={{ color: '#22c55e' }} />
          </div>
          <h1 style={{ color: 'var(--color-navy)', marginBottom: '0.75rem' }}>Complaint Submitted Successfully</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
            Your complaint has been submitted successfully. Save your Complaint ID for reference.
            You can track updates from your dashboard.
          </p>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complaint ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-navy)' }}>{submitted.complaint_number}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/student/complaints/${submitted.id}`} className="btn btn-primary" id="view-submitted-complaint-btn">
              <FileText size={16} /> View Complaint Details
            </Link>
            <Link href="/student/dashboard" className="btn btn-outline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form steps ───────────────────────────────────────────────────────────

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/student/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">Submit New Complaint</h1>
          <p className="page-subtitle">Complete all sections and review before submitting.</p>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Form card */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: '1.0625rem', color: 'var(--color-navy)' }}>
              Step {step + 1}: {STEPS[step]}
            </h2>
          </div>
          <div className="card-body">

            {/* ── Step 0: Complainant ─────────────────────────── */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" value={userInfo.name} readOnly
                      style={{ background: 'var(--color-surface)', cursor: 'not-allowed' }} />
                    <span className="form-hint">Pre-filled from your account</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-control" value={userInfo.email} readOnly
                      style={{ background: 'var(--color-surface)', cursor: 'not-allowed' }} />
                    <span className="form-hint">Pre-filled from your account</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="mobile" className="form-label">Mobile Number <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="mobile" type="tel" className="form-control" placeholder="+91 98765 43210"
                    value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="complainant-type" className="form-label">Complainant Type <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <select id="complainant-type" className={`form-control${errors.complainantType ? ' error' : ''}`}
                      value={form.complainantType} onChange={e => set('complainantType', e.target.value)}
                      style={{ appearance: 'none', paddingRight: '2rem' }}>
                      {COMPLAINANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                  </div>
                  {errors.complainantType && <span className="form-error"><AlertCircle size={12} />{errors.complainantType}</span>}
                </div>
              </div>
            )}

            {/* ── Step 1: Institution ─────────────────────────── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div className="alert alert-info" style={{ fontSize: '0.8125rem' }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>Search for the institution by name or AICTE Permanent ID. All institutions in this demo are synthetic.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Institution Search <span className="required">*</span></label>
                  <InstitutionSearch onSelect={inst => {
                    if (inst) {
                      set('institutionId', inst.id)
                      set('institutionName', inst.name)
                      set('institutionState', inst.state)
                      set('institutionDistrict', inst.district)
                      set('institutionPermanentId', inst.permanent_id)
                      set('institutionNotFound', false)
                    } else {
                      set('institutionId', '')
                    }
                    setErrors(e => ({ ...e, institution: '' }))
                  }} />
                  {errors.institution && <span className="form-error"><AlertCircle size={12} />{errors.institution}</span>}
                </div>
                {form.institutionId && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-control" value={form.institutionState} readOnly style={{ background: 'var(--color-surface)' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">District</label>
                      <input className="form-control" value={form.institutionDistrict} readOnly style={{ background: 'var(--color-surface)' }} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="course-dept" className="form-label">Course / Department <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                  <input id="course-dept" className="form-control" placeholder="e.g. Computer Engineering, B.Tech"
                    value={form.courseOrDept} onChange={e => set('courseOrDept', e.target.value)} maxLength={200} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.institutionNotFound}
                    onChange={e => { set('institutionNotFound', e.target.checked); if (e.target.checked) { set('institutionId', ''); } }}
                    style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-navy)' }} />
                  <span>Institution not found in the directory — I want to proceed and flag this for verification.</span>
                </label>
                {form.institutionNotFound && (
                  <div className="alert alert-warning" style={{ fontSize: '0.8125rem' }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>This complaint will be flagged for manual institution verification by an authorized officer.</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Complaint Details ───────────────────── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div className="form-group">
                  <label htmlFor="category" className="form-label">Complaint Category <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <select id="category" className={`form-control${errors.category ? ' error' : ''}`}
                      value={form.category} onChange={e => set('category', e.target.value)}
                      style={{ appearance: 'none', paddingRight: '2rem' }}>
                      <option value="">— Select a category —</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                  </div>
                  {errors.category && <span className="form-error"><AlertCircle size={12} />{errors.category}</span>}
                  <span className="form-hint">These are prototype categories and must be validated against official AICTE procedures.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="subject" className="form-label">Complaint Subject <span className="required">*</span></label>
                  <input id="subject" className={`form-control${errors.subject ? ' error' : ''}`}
                    placeholder="Brief summary of the complaint (5–200 characters)"
                    value={form.subject} onChange={e => set('subject', e.target.value)} maxLength={200} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {errors.subject ? <span className="form-error"><AlertCircle size={12} />{errors.subject}</span> : <span />}
                    <span className="form-hint">{form.subject.length}/200</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="description" className="form-label">Detailed Description <span className="required">*</span></label>
                  <textarea id="description" className={`form-control${errors.description ? ' error' : ''}`}
                    placeholder="Describe the complaint in detail (minimum 20 characters)…"
                    value={form.description} onChange={e => set('description', e.target.value)}
                    maxLength={5000} rows={6} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {errors.description ? <span className="form-error"><AlertCircle size={12} />{errors.description}</span> : <span />}
                    <span className="form-hint">{form.description.length}/5000</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="date-incident" className="form-label">Date of Incident <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="date-incident" type="date" className="form-control"
                      value={form.dateOfIncident} onChange={e => set('dateOfIncident', e.target.value)}
                      max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="academic-year" className="form-label">Academic Year <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="academic-year" className="form-control" placeholder="e.g. 2025–26"
                      value={form.academicYear} onChange={e => set('academicYear', e.target.value)} maxLength={20} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Previous Complaint About This Issue?</label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[{ v: 'no', l: 'No' }, { v: 'yes', l: 'Yes' }, { v: 'not_sure', l: 'Not Sure' }].map(({ v, l }) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
                        <input type="radio" name="prev-complaint" value={v} checked={form.previousComplaint === v}
                          onChange={() => set('previousComplaint', v)}
                          style={{ accentColor: 'var(--color-navy)', width: '1rem', height: '1rem' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                {form.previousComplaint === 'yes' && (
                  <div className="form-group">
                    <label htmlFor="prev-complaint-id" className="form-label">Previous Complaint ID <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="prev-complaint-id" className="form-control" placeholder="e.g. AICTE-SIH-2025-00001"
                      value={form.previousComplaintId} onChange={e => set('previousComplaintId', e.target.value)} maxLength={50} />
                  </div>
                )}
                {/* File upload */}
                <div className="form-group">
                  <label className="form-label">Supporting Documents <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional, max {MAX_FILES} files)</span></label>
                  <label htmlFor="file-upload" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem',
                    padding: '1.5rem', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius)',
                    cursor: files.length >= MAX_FILES ? 'not-allowed' : 'pointer', opacity: files.length >= MAX_FILES ? 0.5 : 1,
                    transition: 'border-color 0.15s', background: 'var(--color-surface)',
                  }}>
                    <Upload size={20} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Click to upload · PDF, PNG, JPEG · Max {MAX_FILE_MB} MB each
                    </span>
                    <input id="file-upload" type="file" multiple accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileAdd} style={{ display: 'none' }}
                      disabled={files.length >= MAX_FILES} />
                  </label>
                  {errors.files && <span className="form-error"><AlertCircle size={12} />{errors.files}</span>}
                  {files.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.625rem' }}>
                      {files.map(f => (
                        <div key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem',
                          border: `1px solid ${f.error ? '#fecaca' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius)', background: f.error ? '#fef2f2' : 'white', fontSize: '0.875rem'
                        }}>
                          <FileText size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            {(f.file.size / 1024).toFixed(0)} KB
                          </span>
                          {f.error && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{f.error}</span>}
                          <button type="button" onClick={() => removeFile(f.id)} aria-label="Remove file"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', flexShrink: 0 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Declaration & Review ───────────────── */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Review summary */}
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--color-navy)', marginBottom: '0.875rem' }}>Review Your Complaint</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: 'Complainant Type', value: COMPLAINANT_TYPES.find(t => t.value === form.complainantType)?.label },
                      { label: 'Institution', value: form.institutionNotFound ? 'Not Found (flagged)' : form.institutionName },
                      { label: 'Category', value: CATEGORIES.find(c => c.value === form.category)?.label },
                      { label: 'Subject', value: form.subject },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: '1rem', padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 600, minWidth: '10rem', color: 'var(--color-text-muted)' }}>{label}</span>
                        <span style={{ color: 'var(--color-text)' }}>{value || '—'}</span>
                      </div>
                    ))}
                    <div style={{ padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Description</span>
                      <p style={{ margin: '0.375rem 0 0', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{form.description}</p>
                    </div>
                    {files.filter(f => !f.error).length > 0 && (
                      <div style={{ padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Attachments</span>
                        <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {files.filter(f => !f.error).map(f => (
                            <span key={f.id} style={{ color: 'var(--color-text)' }}>📎 {f.file.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Privacy notice */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <Shield size={18} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: '0.125rem' }} />
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', color: '#1e3a8a' }}>Privacy Notice & Declaration</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.8 }}>
                        <li>Your complaint will be processed by authorized AICTE personnel only.</li>
                        <li>The system will use your complaint details to determine the appropriate Bureau/Cell (RB or PGRC).</li>
                        <li>You can track your complaint at any time from your authenticated dashboard.</li>
                        <li>Personal information and supporting documents will not be publicly exposed.</li>
                        <li>This is a demonstration system — do not submit real personal data or sensitive information.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem', padding: '0.875rem', border: `1.5px solid ${errors.declarationAccepted ? '#ef4444' : 'var(--color-border)'}`, borderRadius: 'var(--radius)', background: 'white' }}>
                  <input type="checkbox" checked={form.declarationAccepted}
                    onChange={e => set('declarationAccepted', e.target.checked)}
                    style={{ marginTop: '0.125rem', width: '1.125rem', height: '1.125rem', accentColor: 'var(--color-navy)', flexShrink: 0 }}
                    id="declaration-checkbox" />
                  <span>
                    I declare that the information provided is true to the best of my knowledge.
                    I accept the privacy notice above and understand that this is a demonstration system.
                  </span>
                </label>
                {errors.declarationAccepted && <span className="form-error"><AlertCircle size={12} />{errors.declarationAccepted}</span>}

                {submitError && (
                  <div className="alert alert-error">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button onClick={prevStep} className="btn btn-outline" disabled={step === 0} id="prev-step-btn">
              <ArrowLeft size={16} /> Previous
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {step < STEPS.length - 1 ? (
                <button onClick={nextStep} className="btn btn-primary" id="next-step-btn">
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={handleSubmit} className="btn btn-teal" disabled={submitting} id="submit-complaint-btn"
                  style={{ padding: '0.625rem 1.75rem' }}>
                  {submitting ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Submitting…</> : '✓ Submit Complaint'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
