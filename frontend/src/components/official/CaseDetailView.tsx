'use client'

import { useEffect, useState, useCallback, type FC } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import OfficialLayout from '@/components/official/OfficialLayout'
import {
  getOfficialCaseDetail,
  updateCaseStatus,
  addCaseNote,
  transferCase,
  escalateCase,
  resolveCase,
  type OfficialCaseDetail,
  type Bureau,
  VALID_TRANSITIONS,
} from '@/lib/officialApi'
import {
  ArrowLeft, ChevronDown, AlertTriangle, CheckCircle2, Clock,
  ArrowLeftRight, FileText, MessageSquare, Send, Shield,
  Info, Building2, User, Calendar, ExternalLink, Paperclip,
} from 'lucide-react'

// Export valid transitions map so components can use it
export { type Bureau }

const CATEGORY_LABELS: Record<string, string> = {
  approval_regulatory_compliance: 'Approval / Regulatory Compliance',
  institution_administration: 'Institution Administration',
  academic_grievance: 'Academic Grievance',
  student_facilities: 'Student Facilities',
  examination_evaluation: 'Examination & Evaluation',
  fee_related: 'Fee Related',
  other: 'Other',
}

const VALID_TRANSITIONS_MAP: Record<string, string[]> = {
  submitted:                ['routing_completed', 'assigned', 'escalated'],
  routing_completed:        ['assigned', 'escalated'],
  assigned:                 ['under_review', 'additional_info_required', 'transferred', 'escalated'],
  under_review:             ['under_process', 'additional_info_required', 'transferred', 'escalated'],
  under_process:            ['additional_info_required', 'transferred', 'escalated', 'resolved'],
  additional_info_required: ['under_review', 'under_process', 'escalated', 'transferred'],
  transferred:              ['under_review', 'assigned', 'escalated'],
  escalated:                ['under_review', 'under_process', 'resolved', 'closed'],
  resolved:                 ['closed'],
  closed:                   [],
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  routing_completed: 'Routing Completed',
  assigned: 'Assigned',
  under_review: 'Under Review',
  under_process: 'Under Process',
  additional_info_required: 'Additional Info Required',
  transferred: 'Transferred',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  triage: 'In Triage',
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status.replace(/_/g, ' ')}</span>
}

function TimelineEntry({ status, note, date }: { status: string; note?: string; date: string }) {
  return (
    <div className="official-timeline-entry">
      <div className="official-timeline-dot">
        {status === 'resolved' || status === 'closed' ? <CheckCircle2 size={14} /> :
         status === 'escalated' ? <AlertTriangle size={14} /> :
         status === 'transferred' ? <ArrowLeftRight size={14} /> :
         <Clock size={14} />}
      </div>
      <div className="official-timeline-body">
        <div className="official-timeline-status">
          <StatusBadge status={status} />
          <span className="official-timeline-date">
            {new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {note && <div className="official-timeline-note">{note}</div>}
      </div>
    </div>
  )
}

interface CaseDetailViewProps {
  caseId: string
  bureau: Bureau
  backHref: string
}

const CaseDetailView: FC<CaseDetailViewProps> = ({ caseId, bureau, backHref }) => {
  const router = useRouter()
  const [caseData, setCaseData] = useState<OfficialCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes' | 'routing' | 'documents'>('overview')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Action forms
  const [statusModal, setStatusModal] = useState(false)
  const [noteModal, setNoteModal] = useState(false)
  const [transferModal, setTransferModal] = useState(false)
  const [escalateModal, setEscalateModal] = useState(false)
  const [resolveModal, setResolveModal] = useState(false)

  const [newStatus, setNewStatus] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState<'internal' | 'student_visible'>('internal')
  const [transferBureau, setTransferBureau] = useState<'RB' | 'PGRC'>(bureau === 'RB' ? 'PGRC' : 'RB')
  const [transferReason, setTransferReason] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [nextAction, setNextAction] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getOfficialCaseDetail(caseId)
      setCaseData(data)
    } catch {
      // keep loading false
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleStatusUpdate = async () => {
    if (!newStatus || !actionReason.trim()) {
      setActionError('New status and reason are required.')
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      await updateCaseStatus(caseId, {
        new_status: newStatus,
        action_reason: actionReason,
        internal_note: internalNote || undefined,
        next_action: nextAction || undefined,
      })
      setActionSuccess(`Status updated to "${STATUS_LABELS[newStatus] || newStatus}" successfully.`)
      setStatusModal(false)
      setActionReason('')
      setInternalNote('')
      setNextAction('')
      await load()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Status update failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) { setActionError('Note content is required.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      await addCaseNote(caseId, { content: noteContent, note_type: noteType })
      setActionSuccess('Note added successfully.')
      setNoteModal(false)
      setNoteContent('')
      await load()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to add note.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferReason.trim()) { setActionError('Transfer reason is required.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      await transferCase(caseId, { target_bureau: transferBureau, reason: transferReason })
      setActionSuccess(`Case transferred to ${transferBureau}.`)
      setTransferModal(false)
      setTransferReason('')
      router.push(backHref)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Transfer failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!escalateReason.trim()) { setActionError('Escalation reason is required.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      await escalateCase(caseId, { reason: escalateReason, internal_note: internalNote || undefined })
      setActionSuccess('Case escalated.')
      setEscalateModal(false)
      setEscalateReason('')
      setInternalNote('')
      await load()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Escalation failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!resolutionSummary.trim()) { setActionError('Resolution summary is required.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      await resolveCase(caseId, { resolution_summary: resolutionSummary, internal_note: internalNote || undefined })
      setActionSuccess('Case marked as resolved.')
      setResolveModal(false)
      setResolutionSummary('')
      setInternalNote('')
      await load()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Resolution failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <OfficialLayout bureau={bureau}>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto', color: 'var(--color-navy)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading case…</p>
        </div>
      </OfficialLayout>
    )
  }

  if (!caseData) {
    return (
      <OfficialLayout bureau={bureau}>
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">Case Not Found</div>
          <p className="empty-state-desc">The requested case does not exist or you do not have access.</p>
          <Link href={backHref} className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </OfficialLayout>
    )
  }

  const allowedStatuses = VALID_TRANSITIONS_MAP[caseData.status] || []
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = caseData.expected_disposal_date && caseData.expected_disposal_date < today && !['resolved','closed'].includes(caseData.status)

  const Modal: FC<{ open: boolean; title: string; onClose: () => void; onSubmit: () => void; children: React.ReactNode }> =
    ({ open, title, onClose, onSubmit, children }) => {
      if (!open) return null
      return (
        <div className="official-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
          <div className="official-modal" role="dialog" aria-label={title}>
            <div className="official-modal-header">
              <h3>{title}</h3>
              <button onClick={onClose} className="official-modal-close">×</button>
            </div>
            <div className="official-modal-body">{children}</div>
            <div className="official-modal-footer">
              <button onClick={onClose} className="btn btn-outline">Cancel</button>
              <button onClick={onSubmit} className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <><span className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} /> Working…</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )
    }

  return (
    <OfficialLayout bureau={bureau}>
      <div className="official-page">
        {/* Back nav */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link href={backHref} className="btn btn-ghost btn-sm" style={{ paddingLeft: '0', gap: '0.375rem' }}>
            <ArrowLeft size={14} /> Back to {bureau} Dashboard
          </Link>
        </div>

        {/* Case header */}
        <div className="official-case-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h1 className="official-case-title">{caseData.complaint_number}</h1>
              <StatusBadge status={caseData.status} />
              {isOverdue && (
                <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                  <AlertTriangle size={11} /> Overdue
                </span>
              )}
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                <Shield size={11} /> {caseData.assigned_bureau}
              </span>
            </div>
            <div className="official-case-subject">{caseData.subject}</div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Building2 size={13} /> {caseData.institution?.name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={13} /> {caseData.complainant_name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} /> Filed: {new Date(caseData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {caseData.expected_disposal_date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? '#991b1b' : 'var(--color-text-muted)' }}>
                  <Clock size={13} /> Disposal: {new Date(caseData.expected_disposal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {caseData.status !== 'closed' && (
            <div className="official-case-actions">
              {allowedStatuses.length > 0 && (
                <button id="update-status-btn" onClick={() => { setStatusModal(true); setActionError('') }} className="btn btn-primary btn-sm">
                  <Clock size={14} /> Update Status
                </button>
              )}
              <button id="add-note-btn" onClick={() => { setNoteModal(true); setActionError('') }} className="btn btn-outline btn-sm">
                <MessageSquare size={14} /> Add Note
              </button>
              {caseData.status !== 'resolved' && caseData.status !== 'closed' && (
                <button id="transfer-btn" onClick={() => { setTransferModal(true); setActionError('') }} className="btn btn-outline btn-sm">
                  <ArrowLeftRight size={14} /> Transfer
                </button>
              )}
              {caseData.status !== 'escalated' && caseData.status !== 'resolved' && (
                <button id="escalate-btn" onClick={() => { setEscalateModal(true); setActionError('') }} className="btn btn-outline btn-sm" style={{ color: '#c2410c', borderColor: '#c2410c' }}>
                  <AlertTriangle size={14} /> Escalate
                </button>
              )}
              {!['resolved','closed'].includes(caseData.status) && (
                <button id="resolve-btn" onClick={() => { setResolveModal(true); setActionError('') }} className="btn btn-outline btn-sm" style={{ color: '#166534', borderColor: '#166534' }}>
                  <CheckCircle2 size={14} /> Resolve
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        {actionSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <CheckCircle2 size={15} />
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
          </div>
        )}
        {actionError && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={15} />
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="official-tabs">
          {[
            { key: 'overview', label: 'Overview', icon: <FileText size={14} /> },
            { key: 'timeline', label: `Timeline (${caseData.complaint_status_history?.length || 0})`, icon: <Clock size={14} /> },
            { key: 'notes', label: `Notes (${caseData.case_notes?.length || 0})`, icon: <MessageSquare size={14} /> },
            { key: 'routing', label: 'AI Routing', icon: <Shield size={14} /> },
            { key: 'documents', label: `Documents (${caseData.complaint_attachments?.length || 0})`, icon: <Paperclip size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              className={`official-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card" style={{ marginTop: '0.75rem' }}>
          {activeTab === 'overview' && (
            <div className="official-case-overview">
              <div className="official-overview-grid">
                <div className="card" style={{ background: 'var(--color-surface)' }}>
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Complaint Details</h3></div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <div className="overview-label">Complaint ID</div>
                      <div className="overview-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{caseData.complaint_number}</div>
                    </div>
                    <div>
                      <div className="overview-label">Category</div>
                      <div className="overview-value">{CATEGORY_LABELS[caseData.category] || caseData.category}</div>
                    </div>
                    <div>
                      <div className="overview-label">Department / Course</div>
                      <div className="overview-value">{caseData.course_or_department || '—'}</div>
                    </div>
                    {caseData.date_of_incident && (
                      <div>
                        <div className="overview-label">Date of Incident</div>
                        <div className="overview-value">{new Date(caseData.date_of_incident).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}
                    <div>
                      <div className="overview-label">Previous Complaint Filed?</div>
                      <div className="overview-value">{caseData.previous_complaint === 'yes' ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ background: 'var(--color-surface)' }}>
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Institution</h3></div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <div className="overview-label">Name</div>
                      <div className="overview-value">{caseData.institution?.name}</div>
                    </div>
                    <div>
                      <div className="overview-label">AICTE Permanent ID</div>
                      <div className="overview-value" style={{ fontFamily: 'monospace' }}>{caseData.institution?.permanent_id || '—'}</div>
                    </div>
                    <div>
                      <div className="overview-label">State / District</div>
                      <div className="overview-value">{caseData.institution?.state}, {caseData.institution?.district}</div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ background: 'var(--color-surface)' }}>
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Complainant</h3></div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <div className="overview-label">Name</div>
                      <div className="overview-value">{caseData.complainant_name}</div>
                    </div>
                    <div>
                      <div className="overview-label">Email</div>
                      <div className="overview-value">{caseData.complainant_email}</div>
                    </div>
                    {caseData.mobile && (
                      <div>
                        <div className="overview-label">Mobile</div>
                        <div className="overview-value">{caseData.mobile}</div>
                      </div>
                    )}
                    <div>
                      <div className="overview-label">Type</div>
                      <div className="overview-value" style={{ textTransform: 'capitalize' }}>{caseData.complainant_type}</div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ background: 'var(--color-surface)' }}>
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Case Processing</h3></div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <div className="overview-label">Assigned Bureau</div>
                      <div className="overview-value">
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>{caseData.assigned_bureau}</span>
                      </div>
                    </div>
                    <div>
                      <div className="overview-label">Current Status</div>
                      <div className="overview-value"><StatusBadge status={caseData.status} /></div>
                    </div>
                    {caseData.next_action && (
                      <div>
                        <div className="overview-label">Next Action</div>
                        <div className="overview-value">{caseData.next_action}</div>
                      </div>
                    )}
                    {caseData.date_assigned && (
                      <div>
                        <div className="overview-label">Date Assigned</div>
                        <div className="overview-value">{new Date(caseData.date_assigned).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}
                    {caseData.date_resolved && (
                      <div>
                        <div className="overview-label">Date Resolved</div>
                        <div className="overview-value">{new Date(caseData.date_resolved).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full description */}
              <div style={{ marginTop: '1.25rem' }}>
                <div className="card" style={{ background: 'var(--color-surface)' }}>
                  <div className="card-header"><h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Full Description of Complaint</h3></div>
                  <div style={{ padding: '1.25rem', lineHeight: 1.75, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                    {caseData.description}
                  </div>
                </div>
              </div>

              {caseData.resolution_summary && (
                <div className="alert alert-success" style={{ marginTop: '1.25rem' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Resolution Summary:</strong>
                    <div style={{ marginTop: '0.25rem' }}>{caseData.resolution_summary}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{ padding: '1.5rem' }}>
              <div className="official-timeline">
                {(caseData.complaint_status_history || []).length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No status history available.</p>
                ) : (
                  [...(caseData.complaint_status_history || [])].reverse().map((entry, idx) => (
                    <TimelineEntry key={idx} status={entry.status} note={entry.note} date={entry.created_at} />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div style={{ padding: '1.5rem' }}>
              {(caseData.case_notes || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="empty-state-icon">💬</div>
                  <div className="empty-state-title">No notes yet</div>
                  <p className="empty-state-desc">Click "Add Note" to add an internal note or a student-visible message.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {caseData.case_notes?.map(note => (
                    <div key={note.id} className="official-note-card">
                      <div className="official-note-header">
                        <span className={`badge ${note.note_type === 'internal' ? '' : 'badge-resolved'}`} style={note.note_type === 'internal' ? { background: '#f5f3ff', color: '#6d28d9' } : {}}>
                          {note.note_type === 'internal' ? '🔒 Internal' : '👤 Student Visible'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {new Date(note.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="official-note-content">{note.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'routing' && (
            <div style={{ padding: '1.5rem' }}>
              {(caseData.routing_decisions || []).length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No routing decision recorded.</p>
              ) : (
                caseData.routing_decisions?.map((rd, idx) => (
                  <div key={idx} className="card" style={{ background: 'var(--color-surface)', marginBottom: '1rem' }}>
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          <Shield size={11} /> Assigned to {rd.assigned_bureau}
                        </span>
                        {rd.confidence_score !== undefined && rd.confidence_score !== null && (
                          <span className="badge" style={{ background: '#f0fdf4', color: '#166534' }}>
                            Confidence: {Math.round(rd.confidence_score * 100)}%
                          </span>
                        )}
                        <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9' }}>
                          {rd.routing_method?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div>
                        <div className="overview-label">Routing Reason</div>
                        <div className="overview-value" style={{ fontStyle: 'italic' }}>{rd.routing_reason}</div>
                      </div>
                      {rd.ruleset_version && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Ruleset v{rd.ruleset_version} — {new Date(rd.created_at).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div className="alert alert-warning" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                <Info size={13} />
                <span>⚠️ AI routing rules are illustrative for the SIH prototype. They must be validated against official AICTE bureau/cell responsibilities before production use.</span>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div style={{ padding: '1.5rem' }}>
              {(caseData.complaint_attachments || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <div className="empty-state-icon">📎</div>
                  <div className="empty-state-title">No documents attached</div>
                  <p className="empty-state-desc">The complainant has not attached any documents to this complaint.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {caseData.complaint_attachments?.map(att => (
                    <div key={att.id} className="official-doc-row">
                      <Paperclip size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{att.filename}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {att.content_type} · {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : ''} ·
                          Uploaded {new Date(att.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ gap: '0.25rem' }}>
                        <ExternalLink size={13} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      <Modal open={statusModal} title="Update Case Status" onClose={() => setStatusModal(false)} onSubmit={handleStatusUpdate}>
        <div className="form-group">
          <label className="form-label">New Status <span className="required">*</span></label>
          <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="">Select status…</option>
            {allowedStatuses.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Action Reason / Remarks <span className="required">*</span></label>
          <textarea className="form-control" rows={3} placeholder="Explain the reason for this status change…" value={actionReason} onChange={e => setActionReason(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Next Action (Optional)</label>
          <input type="text" className="form-control" placeholder="e.g., Send notice to institution" value={nextAction} onChange={e => setNextAction(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Internal Note (Optional)</label>
          <textarea className="form-control" rows={2} placeholder="Internal note for officers…" value={internalNote} onChange={e => setInternalNote(e.target.value)} />
        </div>
        {actionError && <div className="alert alert-error">{actionError}</div>}
      </Modal>

      <Modal open={noteModal} title="Add Case Note" onClose={() => setNoteModal(false)} onSubmit={handleAddNote}>
        <div className="form-group">
          <label className="form-label">Note Type</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {(['internal', 'student_visible'] as const).map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="note_type" value={t} checked={noteType === t} onChange={() => setNoteType(t)} />
                {t === 'internal' ? '🔒 Internal (officials only)' : '👤 Student Visible'}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Note Content <span className="required">*</span></label>
          <textarea className="form-control" rows={5} placeholder="Enter your note…" value={noteContent} onChange={e => setNoteContent(e.target.value)} />
        </div>
        {actionError && <div className="alert alert-error">{actionError}</div>}
      </Modal>

      <Modal open={transferModal} title="Transfer Case to Another Bureau" onClose={() => setTransferModal(false)} onSubmit={handleTransfer}>
        <div className="alert alert-warning" style={{ fontSize: '0.8125rem' }}>
          <AlertTriangle size={13} />
          <span>Transferring removes the case from your bureau's queue. This action will be logged.</span>
        </div>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Target Bureau <span className="required">*</span></label>
          <select className="form-control" value={transferBureau} onChange={e => setTransferBureau(e.target.value as 'RB' | 'PGRC')}>
            <option value="RB">Regulation Bureau (RB)</option>
            <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reason for Transfer <span className="required">*</span></label>
          <textarea className="form-control" rows={3} placeholder="Explain why this case should be handled by the other bureau…" value={transferReason} onChange={e => setTransferReason(e.target.value)} />
        </div>
        {actionError && <div className="alert alert-error">{actionError}</div>}
      </Modal>

      <Modal open={escalateModal} title="Escalate Case" onClose={() => setEscalateModal(false)} onSubmit={handleEscalate}>
        <div className="form-group">
          <label className="form-label">Escalation Reason <span className="required">*</span></label>
          <textarea className="form-control" rows={4} placeholder="Explain why this case must be escalated to senior management…" value={escalateReason} onChange={e => setEscalateReason(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Internal Note (Optional)</label>
          <textarea className="form-control" rows={2} placeholder="Additional internal context…" value={internalNote} onChange={e => setInternalNote(e.target.value)} />
        </div>
        {actionError && <div className="alert alert-error">{actionError}</div>}
      </Modal>

      <Modal open={resolveModal} title="Mark Case as Resolved" onClose={() => setResolveModal(false)} onSubmit={handleResolve}>
        <div className="alert alert-info" style={{ fontSize: '0.8125rem' }}>
          <Info size={13} />
          <span>Resolution summary will be visible to the student. Ensure all corrective actions have been completed.</span>
        </div>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Resolution Summary <span className="required">*</span></label>
          <textarea className="form-control" rows={5} placeholder="Describe how the complaint was resolved and what action was taken…" value={resolutionSummary} onChange={e => setResolutionSummary(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Internal Note (Optional)</label>
          <textarea className="form-control" rows={2} placeholder="Internal notes for closure…" value={internalNote} onChange={e => setInternalNote(e.target.value)} />
        </div>
        {actionError && <div className="alert alert-error">{actionError}</div>}
      </Modal>
    </OfficialLayout>
  )
}

export default CaseDetailView
