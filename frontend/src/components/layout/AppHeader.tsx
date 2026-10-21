'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, LayoutDashboard, Bell, User, LogOut,
  Menu, X, ChevronDown
} from 'lucide-react'

export default function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name,
        })
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_ev: string, session: any) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name,
        })
      } else {
        setUser(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    setUserMenuOpen(false)
  }

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <header className="site-header">
      <div className="header-main container">
        {/* Brand */}
        <Link href={user ? '/student/dashboard' : '/'} className="header-brand">
          <div className="header-logo">AICTE</div>
          <div className="header-title">
            <span className="header-title-main">Smart Complaint System</span>
            <span className="header-title-sub">Student Portal — SIH 2026 Prototype</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <nav className="header-nav" style={{ display: 'none' }} id="desktop-nav">
            <Link
              href="/student/dashboard"
              className={`nav-link${isActive('/student/dashboard') ? ' active' : ''}`}
            >
              <LayoutDashboard size={15} style={{ display: 'inline', marginRight: 4 }} />
              Dashboard
            </Link>
            <Link
              href="/student/complaints"
              className={`nav-link${isActive('/student/complaints') ? ' active' : ''}`}
            >
              <FileText size={15} style={{ display: 'inline', marginRight: 4 }} />
              Complaints
            </Link>
            <Link
              href="/student/notifications"
              className={`nav-link${isActive('/student/notifications') ? ' active' : ''}`}
            >
              <Bell size={15} style={{ display: 'inline', marginRight: 4 }} />
              Notifications
            </Link>
          </nav>
        )}

        {/* User menu / auth buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                style={{ color: 'rgba(255,255,255,0.85)', gap: '0.375rem' }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                id="user-menu-btn"
              >
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                  background: 'var(--color-teal)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700, color: 'white'
                }}>
                  {(user.full_name || user.email || 'S')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.875rem', maxWidth: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.full_name || user.email}
                </span>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
                  background: 'white', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                  minWidth: '12rem', zIndex: 50, overflow: 'hidden'
                }} role="menu">
                  <Link href="/student/profile" className="dropdown-item" role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', fontSize: '0.875rem', color: 'var(--color-text)', textDecoration: 'none' }}
                  >
                    <User size={14} /> My Profile
                  </Link>
                  <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
                  <button onClick={handleLogout} role="menuitem"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#ef4444', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>Sign In</Link>
              <Link href="/register" className="btn btn-teal btn-sm">Register</Link>
            </>
          )}
          {/* Mobile menu toggle */}
          <button
            className="btn btn-ghost"
            style={{ color: 'rgba(255,255,255,0.85)', display: 'none' }}
            id="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && user && (
        <nav style={{ background: 'var(--color-navy-dark)', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/student/complaints', label: 'My Complaints', icon: FileText },
            { href: '/student/notifications', label: 'Notifications', icon: Bell },
            { href: '/student/profile', label: 'Profile', icon: User },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive(href) ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', marginBottom: '0.25rem' }}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          #desktop-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
