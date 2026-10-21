'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from '@/lib/api'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { notifications: data } = await getNotifications()
      setNotifications(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead()
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="container" style={{ maxWidth: '42rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ color: 'var(--color-navy)', margin: 0 }}>
              <Bell size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Notifications
              {unread > 0 && <span className="notif-badge" style={{ marginLeft: '0.5rem' }}>{unread}</span>}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
              Updates about your complaints
            </p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAll} className="btn btn-ghost btn-sm" id="mark-all-read-btn">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">No notifications yet</div>
              <p className="empty-state-desc">Notifications will appear here after you submit a complaint.</p>
              <Link href="/student/complaints/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Submit a Complaint
              </Link>
            </div>
          </div>
        ) : (
          <div className="card">
            {notifications.map((n, i) => (
              <div key={n.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                  background: n.is_read ? 'white' : '#eff6ff',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div style={{
                  width: '0.625rem', height: '0.625rem', borderRadius: '50%',
                  background: n.is_read ? 'transparent' : '#3b82f6',
                  flexShrink: 0, marginTop: '0.375rem'
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6 }}>{n.message}</p>
                  <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.375rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {n.complaint_id && (
                      <Link href={`/student/complaints/${n.complaint_id}`}
                        style={{ fontSize: '0.75rem', color: 'var(--color-teal)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={e => e.stopPropagation()}
                        id={`notif-link-${n.id}`}>
                        <ExternalLink size={11} /> View complaint
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
