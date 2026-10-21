'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, setDemoSession } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, AlertCircle, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDemoLogin = () => {
    setLoading(true)
    setDemoSession()
    router.push('/student/dashboard')
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
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/student/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--color-surface)' }}>
      <div style={{ width: '100%', maxWidth: '26rem' }}>
        <div className="card">
          <div className="card-header" style={{ textAlign: 'center', padding: '2rem 2rem 1.5rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'var(--color-navy)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
              AICTE
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
              Welcome Back
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              Sign in to your student account
            </p>
          </div>

          <div className="card-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Demo Login button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn btn-teal"
              style={{
                width: '100%',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.9375rem',
                marginBottom: '1.25rem',
              }}
              id="instant-demo-btn"
            >
              <Sparkles size={16} /> Instant Demo Sign In
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{ padding: '0 0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}>OR SIGN IN WITH CREDENTIALS</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address <span className="required">*</span></label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="password" className="form-label">Password <span className="required">*</span></label>
                    <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-teal)', textDecoration: 'none', fontWeight: 500 }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
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
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '0.25rem' }}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem' }}
                  disabled={loading}
                  id="login-submit-btn"
                >
                  {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Signing in…</> : <><LogIn size={16} /> Sign In</>}
                </button>
              </div>
            </form>
          </div>

          <div className="card-footer" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Don't have an account?{' '}
              <Link href="/register" style={{ color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
