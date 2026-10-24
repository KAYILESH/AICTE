'use client'

import { useEffect, useState, Suspense, type ReactNode } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, LayoutDashboard, Folder, InboxIcon,
  AlertTriangle, Bell, ChevronDown, LogOut, User,
  Menu, X, Layers, BarChart3,
} from 'lucide-react'
import {
  getOfficialDemoSession,
  getOfficialProfile,
  getOfficialNotifications,
  clearOfficialDemoSession,
  type OfficialProfile,
  type Bureau,
  type OfficialNotification,
} from '@/lib/officialApi'
import { createClient } from '@/lib/supabase/client'

const RB_NAV = [
  { href: '/rb/dashboard',                        label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/rb/cases',                            label: 'RB Cases',          icon: Folder },
  { href: '/rb/cases?status=assigned',            label: 'Unassigned Queue',  icon: InboxIcon },
  { href: '/rb/cases?overdue_only=true',          label: 'Overdue Cases',     icon: AlertTriangle },
]

const PGRC_NAV = [
  { href: '/pgrc/dashboard',                      label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/pgrc/cases',                          label: 'PGRC Grievances',   icon: Folder },
  { href: '/pgrc/cases?status=assigned',          label: 'Unassigned Queue',  icon: InboxIcon },
  { href: '/pgrc/cases?overdue_only=true',        label: 'Overdue Cases',     icon: AlertTriangle },
]

const BUREAU_COLORS: Record<Bureau, { bg: string; text: string; border: string }> = {
  RB:   { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  PGRC: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  ALL:  { bg: '#ede9fe', text: '#5b21b6', border: '#a78bfa' },
}

interface NavItem {
  href: string
  label: string
  icon: any
}

function NavLinks({
  navItems,
  pathname,
  setSidebarOpen,
}: {
  navItems: NavItem[]
  pathname: string
  setSidebarOpen: (o: boolean) => void
}) {
  const searchParams = useSearchParams()
  const searchStr = searchParams.toString()

  return (
    <>
      {navItems.map(item => {
        const Icon = item.icon
        const [targetPath, targetQuery] = item.href.split('?')
        let active = false
        if (targetQuery) {
          active = pathname === targetPath && searchStr.includes(targetQuery)
        } else {
          active = pathname === targetPath && (!searchStr || (!searchStr.includes('status=') && !searchStr.includes('overdue_only=')))
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`official-nav-item ${active ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {item.label === 'Overdue Cases' && (
              <span className="official-nav-overdue-badge">!</span>
            )}
          </Link>
        )
      })}
    </>
  )
}

export default function OfficialLayout({ children, bureau }: OfficialLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<OfficialProfile | null>(null)
  const [notifications, setNotifications] = useState<OfficialNotification[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const demo = getOfficialDemoSession()
      if (demo) {
        setProfile(demo)
        const notifs = await getOfficialNotifications(demo.bureau)
        setNotifications(notifs)
        setLoading(false)
        return
      }
      try {
        const prof = await getOfficialProfile()
        if (!prof.role || !['rb_official', 'pgrc_official', 'senior_official', 'system_admin'].includes(prof.role)) {
          router.push('/login')
          return
        }
        setProfile(prof)
        const notifs = await getOfficialNotifications(prof.bureau)
        setNotifications(notifs)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleLogout = async () => {
    clearOfficialDemoSession()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = bureau === 'RB' ? RB_NAV : PGRC_NAV
  const bureauColor = BUREAU_COLORS[bureau] || BUREAU_COLORS.RB
  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px', margin: '0 auto', color: 'var(--color-navy)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
            Loading admin portal…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="official-layout">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="official-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`official-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="official-sidebar-header">
          <div className="official-sidebar-brand">
            <div className="official-sidebar-logo">
              <Shield size={18} />
            </div>
            <div>
              <div className="official-sidebar-brand-name">AICTE</div>
              <div className="official-sidebar-brand-sub">Admin Portal</div>
            </div>
          </div>
          <button
            className="official-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bureau badge + user */}
        <div className="official-sidebar-bureau-section">
          <div
            className="official-bureau-badge"
            style={{ background: bureauColor.bg, color: bureauColor.text, borderColor: bureauColor.border }}
          >
            <Shield size={12} />
            {bureau === 'ALL'
              ? 'Senior Official'
              : bureau === 'RB'
              ? 'Regulation Bureau'
              : 'Public Grievance Redressal Cell'}
          </div>
          {profile && (
            <div className="official-sidebar-user">
              <div className="official-sidebar-avatar">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="official-sidebar-username">
                  {profile.display_name.split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="official-sidebar-designation">
                  {profile.designation?.split('—')[0]?.trim() || profile.role}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="official-sidebar-nav">
          <Suspense fallback={
            <>
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} className="official-nav-item">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </>
          }>
            <NavLinks navItems={navItems} pathname={pathname} setSidebarOpen={setSidebarOpen} />
          </Suspense>
        </nav>

        <div className="official-sidebar-footer">
          <div className="official-sidebar-prototype">
            ⚠️ SIH Prototype — Not an official AICTE service.
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="official-main">
        {/* Topbar */}
        <header className="official-topbar">
          <div className="official-topbar-left">
            <button
              className="official-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="official-topbar-breadcrumb">
              <Shield size={14} style={{ color: 'var(--color-teal)' }} />
              <span
                className="official-topbar-bureau-label"
                style={{ color: bureauColor.text, background: bureauColor.bg }}
              >
                {bureau}
              </span>
              <span>Admin Portal</span>
            </div>
          </div>

          <div className="official-topbar-right">
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                id="official-notif-btn"
                className="official-topbar-btn"
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                aria-label={`${unreadCount} unread notifications`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="official-dropdown official-notif-dropdown">
                  <div className="official-dropdown-header">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount} new</span>}
                  </div>
                  <div className="official-notif-list">
                    {notifications.length === 0 ? (
                      <div className="official-dropdown-empty">No notifications</div>
                    ) : (
                      notifications.slice(0, 8).map(n => (
                        <div key={n.id} className={`official-notif-item ${!n.is_read ? 'unread' : ''}`}>
                          <div className="official-notif-message">{n.message}</div>
                          <div className="official-notif-time">
                            {new Date(n.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div style={{ position: 'relative' }}>
              <button
                id="official-profile-btn"
                className="official-topbar-profile-btn"
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
              >
                <div className="official-topbar-avatar">
                  {profile?.display_name.charAt(0).toUpperCase() || 'O'}
                </div>
                <div className="official-topbar-profile-info">
                  <span className="official-topbar-name">
                    {profile?.display_name.split(' ').slice(0, 2).join(' ') || 'Official'}
                  </span>
                  <span className="official-topbar-bureau" style={{ color: bureauColor.text }}>
                    {bureau}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
              </button>

              {profileOpen && (
                <div className="official-dropdown">
                  <div className="official-dropdown-header">
                    <div style={{ fontWeight: 600 }}>{profile?.display_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {profile?.designation}
                    </div>
                    {profile?.employee_id && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        ID: {profile.employee_id}
                      </div>
                    )}
                  </div>
                  <div className="official-dropdown-divider" />
                  <button
                    className="official-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={14} /> Account Settings
                  </button>
                  <div className="official-dropdown-divider" />
                  <button
                    id="official-logout-btn"
                    className="official-dropdown-item official-dropdown-item-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="official-content">
          {children}
        </main>
      </div>

      {/* Click-away to close dropdowns */}
      {(notifOpen || profileOpen) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => { setNotifOpen(false); setProfileOpen(false) }}
        />
      )}
    </div>
  )
}
