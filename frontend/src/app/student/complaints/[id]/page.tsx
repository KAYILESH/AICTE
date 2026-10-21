'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getComplaintDetail, type ComplaintDetail } from '@/lib/api'
import { AlertCircle, Clock, CheckCircle2, FileText, Building2, Tag, Calendar, RefreshCw, Shield } from 'lucide-react'

const STATUS_TIMELINE = [
  { key: 'submitted', label: 'Complaint Submitted' },
  { key: 'routing_completed', label: 'Routing Completed' },
  { key: 'assigned', label: 'Assigned to Bureau/Cell' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'under_process', label: 'Under Process' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

const CATEGORY_LABELS: Record<string, string> = {
  approval_regulatory_compliance: 'Approval / Regulatory Compliance',
  institution_administration: 'Institution Administration',
  academic_grievance: 'Academic-Related Grievance',
  student_facilities: 'Student Facilities',
  examination_evaluation: 'Examination / Evaluation',
  fee_related: 'Fee-Related Grievance',
  other: 'Other',
}

function DetailRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', minWidth: '12rem', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--color-text)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: mono ? 600 : 400 }}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function BureauBadge({ bureau }: { bureau?: string }) {
  if (!bureau) return null
  const labels: Record<string, string> = { RB: 'Regulation Bureau (RB)', PGRC: 'Public Grievance Redressal Cell (PGRC)', triage: 'Triage Queue', pending: 'Routing Pending' }
  return <span className={`badge badge-${bureau}`}>{labels[bureau] || bureau}</span>
}

function ComplaintDetailContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getComplaintDetail(id)
      setComplaint(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load complaint.'
      if (msg.includes('401') || msg.includes('token')) {
        router.push('/login')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Loading complaint details…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <div className="alert alert-error" style={{ maxWidth: '32rem', margin: '0 auto' }}>
          <AlertCircle size={18} />
          <div>
            <strong>Error Loading Complaint</strong>
            <p style={{ margin: '0.25rem 0 0' }}>{error}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/student/dashboard" className="btn btn-outline">← Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (!complaint) return null

  // Compute timeline state
  const historyStatuses = new Set(complaint.status_history.map(h => h.status))
  const currentStatusIdx = STATUS_TIMELINE.findIndex(s => s.key === complaint.status)
  const extraStatuses = complaint.status_history.filter(h =>
    !STATUS_TIMELINE.find(s => s.key === h.status)
  )

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="container" style={{ maxWidth: '56rem' }}>
        {/* Back */}
        <Link href="/student/complaints" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
          ← Back to My Complaints
        </Link>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', color: 'var(--color-navy)', margin: 0, fontFamily: 'monospace' }}>
              {complaint.complaint_number}
            </h1>
            <p style={{ margin: '0.375rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {complaint.subject}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={complaint.status} />
            <BureauBadge bureau={complaint.assigned_bureau} />
            <button onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: '1fr', ['@media(min-width:768px)' as string]: { gridTemplateColumns: '1.5fr 1fr' } }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Institution */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} style={{ color: 'var(--color-navy)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Institution</h2>
              </div>
              <div>
                <DetailRow label="Name" value={complaint.institution.name} />
                <DetailRow label="Permanent ID" value={complaint.institution.permanent_id} mono />
                <DetailRow label="State" value={complaint.institution.state} />
                <DetailRow label="District" value={complaint.institution.district} />
                {complaint.course_or_department && <DetailRow label="Course / Dept." value={complaint.course_or_department} />}
              </div>
            </div>

            {/* Complaint details */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} style={{ color: 'var(--color-navy)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Complaint Details</h2>
              </div>
              <div>
                <DetailRow label="Category" value={CATEGORY_LABELS[complaint.category] || complaint.category} />
                <DetailRow label="Complainant Type" value={complaint.complainant_type.replace(/_/g, ' ')} />
                {complaint.date_of_incident && <DetailRow label="Date of Incident" value={new Date(complaint.date_of_incident).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />}
                {complaint.academic_year && <DetailRow label="Academic Year" value={complaint.academic_year} />}
                <DetailRow label="Previous Complaint" value={complaint.previous_complaint === 'yes' ? `Yes${complaint.previous_complaint_id ? ` (${complaint.previous_complaint_id})` : ''}` : complaint.previous_complaint === 'not_sure' ? 'Not Sure' : 'No'} />
              </div>
              <div style={{ padding: '1rem 0.75rem' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Description</p>
                <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
              </div>
            </div>

            {/* Public remarks / resolution */}
            {complaint.public_remarks && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} style={{ color: 'var(--color-teal)' }} />
                  <h2 style={{ margin: 0, fontSize: '1rem' }}>Remarks from Processing Office</h2>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>
                  <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                    {complaint.public_remarks}
                  </p>
                </div>
              </div>
            )}
            {complaint.resolution_summary && (
              <div className="card" style={{ borderColor: '#bbf7d0' }}>
                <div className="card-header" style={{ background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                  <h2 style={{ margin: 0, fontSize: '1rem', color: '#15803d' }}>Resolution Summary</h2>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>
                  <p style={{ margin: 0, color: '#166534', lineHeight: 1.7 }}>{complaint.resolution_summary}</p>
                </div>
              </div>
            )}

            {/* Attachments */}
            {complaint.attachments.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2 style={{ margin: 0, fontSize: '1rem' }}>Attachments ({complaint.attachments.length})</h2>
                </div>
                <div style={{ padding: '0.875rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {complaint.attachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                      <FileText size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ flex: 1 }}>{att.filename}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{(att.size_bytes / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Attachments are stored securely. Download links are not available in the student portal for this prototype.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — timeline & meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Meta */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-navy)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Case Information</h2>
              </div>
              <div>
                <DetailRow label="Complaint ID" value={complaint.complaint_number} mono />
                <DetailRow label="Current Status" value={complaint.status.replace(/_/g, ' ')} />
                <DetailRow label="Assigned To" value={complaint.assigned_bureau || 'Pending'} />
                <DetailRow label="Submitted" value={new Date(complaint.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <DetailRow label="Last Updated" value={new Date(complaint.updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              </div>
            </div>

            {/* Routing info */}
            {complaint.routing_decision && (
              <div className="card">
                <div className="card-header">
                  <h2 style={{ margin: 0, fontSize: '1rem' }}>Routing Information</h2>
                </div>
                <div style={{ padding: '0.875rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Assigned Bureau</span>
                    <div style={{ marginTop: '0.25rem' }}><BureauBadge bureau={complaint.routing_decision.assigned_bureau} /></div>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Routing Method</span>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text)' }}>{complaint.routing_decision.routing_method.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Reason</span>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text)', lineHeight: 1.5 }}>{complaint.routing_decision.routing_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Timeline */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} style={{ color: 'var(--color-navy)' }} />
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Status Timeline</h2>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <ul className="timeline">
                  {complaint.status_history
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((h, i) => (
                      <li key={i} className="timeline-item">
                        <div className="timeline-dot done">✓</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', textTransform: 'capitalize' }}>
                            {h.status.replace(/_/g, ' ')}
                          </p>
                          {h.note && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{h.note}</p>}
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    ))}
                  {/* Pending future stages */}
                  {STATUS_TIMELINE
                    .filter(s => !historyStatuses.has(s.key) && STATUS_TIMELINE.findIndex(x => x.key === s.key) > (currentStatusIdx >= 0 ? currentStatusIdx : -1))
                    .slice(0, 2)
                    .map(s => (
                      <li key={s.key} className="timeline-item" style={{ opacity: 0.4 }}>
                        <div className="timeline-dot pending">·</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{s.label}</p>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Not yet reached</p>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ComplaintDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading complaint details...</p>
        </div>
      }
    >
      <ComplaintDetailContent />
    </Suspense>
  )
}
