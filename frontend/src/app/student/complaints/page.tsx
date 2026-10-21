'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getComplaints, type ComplaintSummary } from '@/lib/api'
import { PlusCircle, Eye, Search, ChevronDown, AlertCircle } from 'lucide-react'

const STATUS_FILTERS = [
  { value: 'all', label: 'All Complaints' },
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

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    setError('')
    getComplaints({ status, search, sort, page, page_size: pageSize })
      .then(d => { setComplaints(d.items); setTotal(d.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [status, search, sort, page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--color-navy)', margin: 0 }}>My Complaints</h1>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>All complaints submitted from your account</p>
          </div>
          <Link href="/student/complaints/new" className="btn btn-primary" id="new-complaint-list-btn">
            <PlusCircle size={16} /> New Complaint
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '14rem' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="form-control" placeholder="Search ID or subject…" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ paddingLeft: '2.25rem', height: '2.375rem', fontSize: '0.875rem' }} id="complaint-list-search" />
              </div>
              <div style={{ position: 'relative' }}>
                <select className="form-control" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
                  style={{ height: '2.375rem', fontSize: '0.875rem', paddingRight: '2rem', appearance: 'none', minWidth: '10rem' }}
                  id="complaint-list-status-filter" aria-label="Filter by status">
                  {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}
                  style={{ height: '2.375rem', fontSize: '0.875rem', paddingRight: '2rem', appearance: 'none' }}
                  id="complaint-list-sort" aria-label="Sort">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ margin: '1rem 1.5rem' }}><AlertCircle size={15} />{error}</div>}

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }} />
            </div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">{search || status !== 'all' ? 'No matching complaints' : 'No complaints yet'}</div>
              <p className="empty-state-desc">{search || status !== 'all' ? 'Try different search terms or filters.' : 'Submit your first complaint.'}</p>
              {!(search || status !== 'all') && <Link href="/student/complaints/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Complaint</Link>}
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Institution</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Bureau</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-navy)' }}>{c.complaint_number}</span></td>
                      <td style={{ maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{c.institution_name || '—'}</td>
                      <td style={{ maxWidth: '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{c.subject}</td>
                      <td><span className={`badge badge-${c.status}`}>{c.status.replace(/_/g, ' ')}</span></td>
                      <td>{c.assigned_bureau && <span className={`badge badge-${c.assigned_bureau}`}>{c.assigned_bureau}</span>}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <Link href={`/student/complaints/${c.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.625rem' }} id={`list-view-${c.id}`}>
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-outline btn-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
