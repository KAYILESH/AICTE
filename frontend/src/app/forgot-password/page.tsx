'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required.'); return }
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/student/profile`,
      })
      if (authError) throw authError
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--color-surface)' }}>
      <div style={{ width: '100%', maxWidth: '26rem' }}>
        <div className="card">
          <div className="card-header" style={{ textAlign: 'center', padding: '2rem 2rem 1.5rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', background: sent ? '#dcfce7' : 'var(--color-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: sent ? '#22c55e' : 'white' }}>
              {sent ? <CheckCircle size={28} /> : <Mail size={24} />}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
              {sent ? 'Check Your Email' : 'Reset Password'}
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {sent
                ? `We've sent a password reset link to ${email}.`
                : "Enter your email and we'll send you a reset link."}
            </p>
          </div>
          {!sent && (
            <div className="card-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="reset-email" className="form-label">Email Address <span className="required">*</span></label>
                    <input id="reset-email" type="email" className="form-control"
                      placeholder="your-registered@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}
                    disabled={loading} id="forgot-submit-btn">
                    {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Sending…</> : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="card-footer" style={{ textAlign: 'center' }}>
            <Link href="/login" style={{ fontSize: '0.875rem', color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
