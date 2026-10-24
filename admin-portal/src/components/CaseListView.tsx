'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import OfficialLayout from '@/components/OfficialLayout'
import {
  getOfficialCases,
  getOfficialDemoSession,
  type Bureau,
  type OfficialCaseSummary,
} from '@/lib/officialApi'
import {
  Search, ChevronDown, Eye, RefreshCw, AlertTriangle,
  Calendar, Inbox, Folder, Filter, CheckCircle2, Clock
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  approval_regulatory_compliance: 'Approval / Regulatory',
  institution_administration: 'Administration',
  academic_grievance: 'Academic',
  student_facilities: 'Facilities',
  examination_evaluation: 'Examination',
  fee_related: 'Fee Related',
  other: 'Other',
}

const STATUS_FILTERS = [
  { value: 'all',                      label: 'All Cases' },
  { value: 'submitted',                label: 'Submitted' },
  { value: 'routing_completed',        label: 'Routing Completed' },
  { value: 'assigned',                 label: 'Assigned / Unassigned Queue' },
  { value: 'under_review',             label: 'Under Review' },
  { value: 'under_process',            label: 'Under Process' },
  { value: 'additional_info_required', label: 'Info Required' },
  { value: 'transferred',             label: 'Transferred' },
  { value: 'escalated',               label: 'Escalated' },
  { value: 'resolved',                label: 'Resolved' },
  { value: 'closed',                  label: 'Closed' },
]

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function CaseListContent({ bureau }: { bureau: Bureau }) {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'
  const initialOverdue = searchParams.get('overdue_only') === 'true'

  const [cases, setCases] = useState<OfficialCaseSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue)
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Sync state if query params change
  useEffect(() => {
    const qStatus = searchParams.get('status') || 'all'
    const qOverdue = searchParams.get('overdue_only') === 'true'
    setStatusFilter(qStatus)
    setOverdueOnly(qOverdue)
    setPage(1)
  }, [searchParams])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const listData = await getOfficialCases({
        bureau,
        status: statusFilter,
        search,
        sort,
        overdue_only: overdueOnly,
        page,
        page_size: pageSize,
      })
      setCases(listData.items)
      setTotal(listData.total)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load case list.')
    } finally {
      setLoading(false)
    }
  }, [bureau, statusFilter, search, sort, overdueOnly, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPages = Math.ceil(total / pageSize)
  const isDemo = typeof window !== 'undefined' && !!getOfficialDemoSession()
  const bureauLower = bureau.toLowerCase()

  const pageTitle = overdueOnly
    ? 'Overdue Cases Queue'
    : statusFilter === 'assigned'
    ? 'Unassigned Queue'
    : bureau === 'RB'
    ? 'Regulation Bureau Cases'
    : 'PGRC Grievance Cases'

  const pageSubtitle = overdueOnly
    ? 'Cases that have exceeded the expected disposal deadline requiring immediate intervention.'
    : statusFilter === 'assigned'
    ? 'Cases routed to this bureau awaiting assigned officer review and initial action.'
    : `Complete case management queue for ${bureau === 'RB' ? 'Regulation Bureau' : 'Public Grievance Redressal Cell'}.`

  return (
    <OfficialLayout bureau={bureau}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {bureau} Admin Portal
              </span>
              <span style={{ color: 'var(--color-border)' }}>/</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                Cases
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.375rem', color: 'var(--color-navy)', fontWeight: 700 }}>
              {pageTitle}
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {pageSubtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            {isDemo && (
              <div className="alert alert-info" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                <span>Demo mode — synthetic data</span>
              </div>
            )}
            <button onClick={loadData} className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'all' && !overdueOnly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setStatusFilter('all'); setOverdueOnly(false); setPage(1) }}
          >
            <Folder size={13} /> All Cases
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'assigned' && !overdueOnly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setStatusFilter('assigned'); setOverdueOnly(false); setPage(1) }}
          >
            <Inbox size={13} /> Unassigned Queue
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'under_process' && !overdueOnly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setStatusFilter('under_process'); setOverdueOnly(false); setPage(1) }}
          >
            <Clock size={13} /> Under Process
          </button>
          <button
            type="button"
            className={`btn btn-sm ${overdueOnly ? 'btn-primary' : 'btn-outline'}`}
            style={overdueOnly ? { background: '#991b1b', borderColor: '#991b1b' } : { color: '#991b1b' }}
            onClick={() => { setOverdueOnly(true); setStatusFilter('all'); setPage(1) }}
          >
            <AlertTriangle size={13} /> Overdue Only
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'resolved' && !overdueOnly ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setStatusFilter('resolved'); setOverdueOnly(false); setPage(1) }}
          >
            <CheckCircle2 size={13} /> Resolved
          </button>
        </div>

        {/* Case Table Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={15} /> Case Records
                {overdueOnly && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    Overdue Only
                  </span>
                )}
                {statusFilter !== 'all' && !overdueOnly && (
                  <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    Status: {statusFilter.replace(/_/g, ' ')}
                  </span>
                )}
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {total} cases found
              </span>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '15rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="case-search-input"
                  type="search"
                  className="form-control"
                  placeholder="Search by Complaint ID, institution, complainant, subject…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ paddingLeft: '2.25rem', height: '2.25rem', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ position: 'relative', minWidth: '11rem' }}>
                <select
                  id="status-filter-select"
                  className="form-control"
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); setOverdueOnly(false) }}
                  style={{ height: '2.25rem', fontSize: '0.8125rem', paddingRight: '2rem', appearance: 'none' }}
                >
                  {STATUS_FILTERS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  className="form-control"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  style={{ height: '2.25rem', fontSize: '0.8125rem', paddingRight: '2rem', appearance: 'none' }}
                  aria-label="Sort order"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer', userSelect: 'none', color: overdueOnly ? '#991b1b' : 'var(--color-text-muted)', fontWeight: overdueOnly ? 600 : 400 }}>
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={e => { setOverdueOnly(e.target.checked); setPage(1) }}
                  id="overdue-only-checkbox"
                />
                Overdue only
              </label>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ margin: '1rem 1.5rem' }}>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto', color: 'var(--color-navy)' }} />
              <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading cases…</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No cases found</div>
              <p className="empty-state-desc">
                No complaint records matched the current filter or search criteria.
              </p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Institution</th>
                    <th>AICTE PID</th>
                    <th>Complainant</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Disposal Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/${bureauLower}/cases/${c.id}`}
                          style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-navy)', textDecoration: 'none' }}
                        >
                          {c.complaint_number}
                        </Link>
                      </td>
                      <td style={{ maxWidth: '11rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.institution_name}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {c.institution_permanent_id}
                        </span>
                      </td>
                      <td style={{ maxWidth: '9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {c.complainant_name}
                      </td>
                      <td style={{ maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.subject}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem' }}>
                          {CATEGORY_LABELS[c.category] || c.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <StatusBadge status={c.status} />
                          {c.is_overdue && (
                            <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', gap: '0.25rem' }}>
                              <AlertTriangle size={10} /> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.expected_disposal_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: c.is_overdue ? '#991b1b' : 'var(--color-text-muted)' }}>
                            <Calendar size={11} />
                            {new Date(c.expected_disposal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/${bureauLower}/cases/${c.id}`}
                          className="btn btn-ghost btn-sm"
                          id={`view-case-${c.id}`}
                          style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={13} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPage(p)}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </OfficialLayout>
  )
}

export default function CaseListView({ bureau }: { bureau: Bureau }) {
  return (
    <Suspense
      fallback={
        <OfficialLayout bureau={bureau}>
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto', color: 'var(--color-navy)' }} />
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading case queue…</p>
          </div>
        </OfficialLayout>
      }
    >
      <CaseListContent bureau={bureau} />
    </Suspense>
  )
}
