'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import OfficialLayout from '@/components/OfficialLayout'
import {
  getOfficialDashboardStats,
  getOfficialCases,
  getOfficialDemoSession,
  type OfficialDashboardStats,
  type OfficialCaseSummary,
} from '@/lib/officialApi'
import {
  Inbox, Clock, CheckCircle2, AlertTriangle, ArrowLeftRight,
  FileText, Activity, Search, ChevronDown, Eye, RefreshCw,
  Info, Calendar,
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
  { value: 'all',                       label: 'All Cases' },
  { value: 'submitted',                 label: 'Submitted' },
  { value: 'routing_completed',         label: 'Routing Completed' },
  { value: 'assigned',                  label: 'Assigned' },
  { value: 'under_review',              label: 'Under Review' },
  { value: 'under_process',             label: 'Under Process' },
  { value: 'additional_info_required',  label: 'Info Required' },
  { value: 'transferred',              label: 'Transferred' },
  { value: 'escalated',                label: 'Escalated' },
  { value: 'resolved',                 label: 'Resolved' },
  { value: 'closed',                   label: 'Closed' },
]

function StatCard({
  icon, label, value, color, accent, onClick, active
}: {
  icon: React.ReactNode; label: string; value: number; color: string; accent: string
  onClick?: () => void; active?: boolean
}) {
  return (
    <div
      className={`official-stat-card ${active ? 'active' : ''}`}
      style={{ borderTopColor: accent, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="official-stat-icon" style={{ background: accent + '18' }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="official-stat-value" style={{ color }}>{value}</div>
      <div className="official-stat-label">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function OverdueBadge() {
  return (
    <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', gap: '0.25rem' }}>
      <AlertTriangle size={10} /> Overdue
    </span>
  )
}

export default function RBDashboardPage() {
  const [stats, setStats] = useState<OfficialDashboardStats | null>(null)
  const [cases, setCases] = useState<OfficialCaseSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsData, listData] = await Promise.all([
        getOfficialDashboardStats('RB'),
        getOfficialCases({
          bureau: 'RB',
          status: statusFilter,
          search,
          sort,
          overdue_only: overdueOnly,
          page,
          page_size: pageSize,
        }),
      ])
      setStats(statsData)
      setCases(listData.items)
      setTotal(listData.total)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, sort, overdueOnly, page])

  useEffect(() => { loadData() }, [loadData])

  const totalPages = Math.ceil(total / pageSize)
  const isDemo = typeof window !== 'undefined' && !!getOfficialDemoSession()

  return (
    <OfficialLayout bureau="RB">
      <div>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.375rem', color: 'var(--color-navy)', fontWeight: 700 }}>
              Regulation Bureau Dashboard
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              Monitor and manage RB-assigned complaints — approval, regulatory compliance &amp; institutional inspection cases.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            {isDemo && (
              <div className="alert alert-info" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                <Info size={13} />
                <span>Demo mode — synthetic data</span>
              </div>
            )}
            <button onClick={loadData} className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard icon={<FileText size={18} />} label="Total RB Cases" value={stats?.total ?? 0}
            color="var(--color-navy)" accent="#0f2d5c"
            onClick={() => { setStatusFilter('all'); setOverdueOnly(false) }}
            active={statusFilter === 'all' && !overdueOnly} />
          <StatCard icon={<Inbox size={18} />} label="New / Unreviewed" value={stats?.new_unreviewed ?? 0}
            color="#4f46e5" accent="#6366f1"
            onClick={() => { setStatusFilter('assigned'); setOverdueOnly(false) }}
            active={statusFilter === 'assigned'} />
          <StatCard icon={<Activity size={18} />} label="Under Process" value={stats?.under_process ?? 0}
            color="#c2410c" accent="#f97316"
            onClick={() => { setStatusFilter('under_process'); setOverdueOnly(false) }}
            active={statusFilter === 'under_process'} />
          <StatCard icon={<Info size={18} />} label="Awaiting Info" value={stats?.additional_info ?? 0}
            color="#1d4ed8" accent="#3b82f6"
            onClick={() => { setStatusFilter('additional_info_required'); setOverdueOnly(false) }}
            active={statusFilter === 'additional_info_required'} />
          <StatCard icon={<ArrowLeftRight size={18} />} label="Transferred" value={stats?.transferred ?? 0}
            color="#6d28d9" accent="#8b5cf6"
            onClick={() => { setStatusFilter('transferred'); setOverdueOnly(false) }}
            active={statusFilter === 'transferred'} />
          <StatCard icon={<CheckCircle2 size={18} />} label="Resolved / Closed" value={stats?.resolved ?? 0}
            color="#166534" accent="#22c55e"
            onClick={() => { setStatusFilter('resolved'); setOverdueOnly(false) }}
            active={statusFilter === 'resolved'} />
          <StatCard icon={<AlertTriangle size={18} />} label="Overdue Cases" value={stats?.overdue ?? 0}
            color="#991b1b" accent="#ef4444"
            onClick={() => { setOverdueOnly(true); setStatusFilter('all') }}
            active={overdueOnly} />
        </div>

        {/* Cases table */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                RB Case Queue
                {overdueOnly && <span className="badge" style={{ marginLeft: '0.5rem', background: '#fee2e2', color: '#991b1b' }}>Overdue Only</span>}
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{total} cases</span>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '14rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="rb-case-search"
                  type="search"
                  className="form-control"
                  placeholder="Search by Complaint ID, institution, subject…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ paddingLeft: '2.25rem', height: '2.25rem', fontSize: '0.8125rem' }}
                />
              </div>
              <div style={{ position: 'relative', minWidth: '9rem' }}>
                <select
                  id="rb-status-filter"
                  className="form-control"
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); setOverdueOnly(false) }}
                  style={{ height: '2.25rem', fontSize: '0.8125rem', paddingRight: '2rem', appearance: 'none' }}
                >
                  {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}
                  style={{ height: '2.25rem', fontSize: '0.8125rem', paddingRight: '2rem', appearance: 'none' }}
                  aria-label="Sort">
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
                  id="rb-overdue-filter"
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
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto', color: 'var(--color-navy)' }} />
              <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading RB cases…</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No cases found</div>
              <p className="empty-state-desc">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Institution</th>
                    <th>AICTE PID</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Disposal Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-navy)', whiteSpace: 'nowrap' }}>
                          {c.complaint_number}
                        </span>
                      </td>
                      <td style={{ maxWidth: '11rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.institution_name}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {c.institution_permanent_id}
                        </span>
                      </td>
                      <td style={{ maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.subject}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem' }}>{CATEGORY_LABELS[c.category] || c.category}</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <StatusBadge status={c.status} />
                          {c.is_overdue && <OverdueBadge />}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.expected_disposal_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: c.is_overdue ? '#991b1b' : 'var(--color-text-muted)' }}>
                            <Calendar size={11} />
                            {new Date(c.expected_disposal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>}
                      </td>
                      <td>
                        <Link
                          href={`/rb/cases/${c.id}`}
                          className="btn btn-ghost btn-sm"
                          id={`rb-view-case-${c.id}`}
                          style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}
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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">Previous</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}>{p}</button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-outline btn-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </OfficialLayout>
  )
}
