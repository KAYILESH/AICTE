'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Shield, AlertCircle, LogIn, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  setOfficialDemoSession,
  getOfficialProfile,
  type Bureau,
} from '@/lib/officialApi'

export default function OfficialLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Demo quick login
  const handleDemoLogin = async (bureau: Bureau) => {
    setLoading(true)
    setError('')
    setOfficialDemoSession(bureau)
    const path = bureau === 'RB' ? '/official/rb/dashboard' : '/official/pgrc/dashboard'
    router.push(path)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      // Authenticate with Supabase
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('Invalid credentials. Please check your email and password.')
        return
      }
      // Resolve role from backend (never from frontend)
      const profile = await getOfficialProfile()
      if (!profile || !['rb_official','pgrc_official','senior_official','system_admin'].includes(profile.role)) {
        await supabase.auth.signOut()
        setError('Access denied. This portal is for authorized officials only. Students should use the main login page.')
        return
      }
      // Role-based redirection
      if (profile.role === 'rb_official') {
        router.push('/official/rb/dashboard')
      } else if (profile.role === 'pgrc_official') {
        router.push('/official/pgrc/dashboard')
      } else {
        router.push('/official/rb/dashboard') // Senior/admin: default to RB
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="official-login-bg">
      <div className="official-login-card">
        {/* Header branding */}
        <div className="official-login-header">
          <div className="official-login-logo">
            <Shield size={28} />
          </div>
          <div className="official-login-brand">
            <span className="official-login-brand-main">AICTE Official Portal</span>
            <span className="official-login-brand-sub">Regulation Bureau &amp; PGRC — SIH Prototype</span>
          </div>
        </div>

        <div className="official-login-body">
          {/* Prototype notice */}
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>
              <strong>SIH Demo:</strong> This is a prototype portal for RB &amp; PGRC officials.
              Student accounts are not permitted here.
            </span>
          </div>

          {/* Demo quick access */}
          <div className="official-demo-section">
            <p className="official-demo-label">
              <Building2 size={13} />
              Quick Demo Access (SIH Prototype)
            </p>
            <div className="official-demo-btns">
              <button
                id="demo-rb-btn"
                className="btn official-demo-btn-rb"
                onClick={() => handleDemoLogin('RB')}
                disabled={loading}
              >
                <Shield size={14} />
                Demo as RB Official
              </button>
              <button
                id="demo-pgrc-btn"
                className="btn official-demo-btn-pgrc"
                onClick={() => handleDemoLogin('PGRC')}
                disabled={loading}
              >
                <Shield size={14} />
                Demo as PGRC Official
              </button>
            </div>
          </div>

          <div className="official-divider">
            <span>OR SIGN IN WITH CREDENTIALS</span>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="official-form-stack">
              <div className="form-group">
                <label htmlFor="official-email" className="form-label">
                  Official Email / Login ID <span className="required">*</span>
                </label>
                <input
                  id="official-email"
                  type="email"
                  className="form-control"
                  placeholder="officer@aicte-demo.gov.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="official-password" className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: '0.8125rem', color: 'var(--color-teal)', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="official-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '0.25rem' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="official-login-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.8125rem' }}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Signing in…</>
                  : <><LogIn size={16} /> Sign In to Official Portal</>
                }
              </button>
            </div>
          </form>
        </div>

        <div className="official-login-footer">
          <p>Student portal access? <Link href="/login">Sign in here</Link></p>
          <p className="official-login-footer-note">
            Official accounts are provisioned by an authorized administrator.
            Public registration is not permitted.
          </p>
        </div>
      </div>
    </div>
  )
}
