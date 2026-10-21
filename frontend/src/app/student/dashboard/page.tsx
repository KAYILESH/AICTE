'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getDashboardStats, getComplaints, type DashboardStats, type ComplaintSummary } from '@/lib/api'
import {
  PlusCircle, FileText, Clock, CheckCircle2, Activity,
  Search, ChevronDown, Eye, AlertCircle, RefreshCw
} from 'lucide-react'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'routing_completed', label: 'Routing Completed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'under_process', label: 'Under Process' },
  { value: 'additional_info_required', label: 'Info Required' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const CATEGORY_LABELS: Record<string, string> = {
  approval_regulatory_compliance: 'Approval / Regulatory',
  institution_administration: 'Administration',
  academic_grievance: 'Academic',
  student_facilities: 'Facilities',
  examination_evaluation: 'Examination',
  fee_related: 'Fee Related',
  other: 'Other',
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function BureauBadge({ bureau }: { bureau?: string }) {
  if (!bureau) return null
  return <span className={`badge badge-${bureau}`}>{bureau}</span>
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="stat-icon" style={{ background: color + '18' }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser({ email: data.user.email, name: data.user.user_metadata?.full_name })
    })
  }, [router])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsData, listData] = await Promise.all([
        getDashboardStats(),
        getComplaints({ status: statusFilter, search, sort, page, page_size: pageSize }),
      ])
      setStats(statsData)
      setComplaints(listData.items)
      setTotal(listData.total)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) loadData() }, [user, statusFilter, search, sort, page])

  const totalPages = Math.ceil(total / pageSize)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student'

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Welcome */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '1.5rem 0' }}>
        <div className="container">
          <div className="welcome-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>
                  Welcome back, {displayName}
                </h1>
                <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.75)', maxWidth: '36rem', fontSize: '0.9375rem' }}>
                  Submit complaints about technical education institutions and track their resolution.
                  Each complaint receives a unique ID and is routed to the appropriate bureau for action.
                </p>
              </div>
              <Link href="/student/complaints/new" className="btn btn-teal" style={{ flexShrink: 0 }} id="new-complaint-btn">
                <PlusCircle size={16} />
                Submit New Complaint
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={<FileText size={18} />} label="Total Complaints" value={stats?.total ?? 0} color="#0f2d5c" />
          <StatCard icon={<Clock size={18} />} label="Submitted / Routing" value={stats?.submitted ?? 0} color="#6366f1" />
          <StatCard icon={<Activity size={18} />} label="Under Process" value={stats?.under_process ?? 0} color="#f59e0b" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Resolved" value={stats?.resolved ?? 0} color="#22c55e" />
        </div>

        {/* Complaints Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem' }}>My Complaints</h2>
              <button onClick={loadData} className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }} aria-label="Refresh complaints">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '14rem' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by Complaint ID or subject…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ paddingLeft: '2.25rem', height: '2.375rem', fontSize: '0.875rem' }}
                  id="complaint-search"
                />
              </div>
              {/* Status filter */}
              <div style={{ position: 'relative', minWidth: '10rem' }}>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                  style={{ height: '2.375rem', fontSize: '0.875rem', paddingRight: '2rem', appearance: 'none' }}
                  id="status-filter"
                  aria-label="Filter by status"
                >
                  {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>
              {/* Sort */}
              <div style={{ position: 'relative' }}>
                <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}
                  style={{ height: '2.375rem', fontSize: '0.875rem', paddingRight: '2rem', appearance: 'none' }}
                  id="sort-order" aria-label="Sort complaints">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ margin: '1rem 1.5rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading complaints…</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">
                {search || statusFilter !== 'all' ? 'No matching complaints' : 'No complaints yet'}
              </div>
              <p className="empty-state-desc">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : 'Submit your first complaint to get started.'}
              </p>
              {!(search || statusFilter !== 'all') && (
                <Link href="/student/complaints/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <PlusCircle size={16} /> Submit Complaint
                </Link>
              )}
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Institution</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Bureau</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                          {c.complaint_number}
                        </span>
                      </td>
                      <td style={{ maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.institution_name || '—'}
                      </td>
                      <td style={{ maxWidth: '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.subject}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem' }}>{CATEGORY_LABELS[c.category] || c.category}</span>
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                      <td><BureauBadge bureau={c.assigned_bureau} /></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <Link href={`/student/complaints/${c.id}`} className="btn btn-ghost btn-sm"
                          style={{ padding: '0.25rem 0.625rem' }} id={`view-complaint-${c.id}`}>
                          <Eye size={14} /> View
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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn btn-outline btn-sm">Previous</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn btn-outline btn-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
