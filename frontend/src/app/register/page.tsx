'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Info } from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number', ok: /\d/.test(password) },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['#ef4444', '#f59e0b', '#22c55e']
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.375rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < score ? colors[score - 1] : '#e2e8f0', transition: 'background 0.2s' }} />
        ))}
      </div>
      {checks.map(c => (
        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: c.ok ? '#166534' : 'var(--color-text-muted)' }}>
          <CheckCircle size={11} style={{ color: c.ok ? '#22c55e' : '#e2e8f0' }} />
          {c.label}
        </div>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', privacy: false })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) return 'Full name must be at least 2 characters.'
    if (!form.email) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    if (!form.privacy) return 'You must accept the privacy notice and terms.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName.trim() } },
      })
      if (authError) throw authError
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '26rem', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '4rem', height: '4rem', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>Account Created!</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            We've sent a confirmation email to <strong>{form.email}</strong>.
            Please verify your email address before signing in.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--color-surface)' }}>
      <div style={{ width: '100%', maxWidth: '30rem' }}>
        <div className="card">
          <div className="card-header" style={{ textAlign: 'center', padding: '2rem 2rem 1.5rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'var(--color-navy)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>AICTE</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>Create Account</h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Register to submit and track complaints</p>
          </div>
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
                  <label htmlFor="reg-fullname" className="form-label">Full Name <span className="required">*</span></label>
                  <input id="reg-fullname" type="text" className="form-control" placeholder="e.g. Priya Sharma"
                    value={form.fullName} onChange={e => set('fullName', e.target.value)} autoComplete="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-email" className="form-label">Email Address <span className="required">*</span></label>
                  <input id="reg-email" type="email" className="form-control" placeholder="you@example.com"
                    value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password" className="form-label">Password <span className="required">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input id="reg-password" type={showPw ? 'text' : 'password'} className="form-control"
                      placeholder="Create a strong password" value={form.password}
                      onChange={e => set('password', e.target.value)} autoComplete="new-password"
                      required style={{ paddingRight: '2.75rem' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide' : 'Show'}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && <PasswordStrength password={form.password} />}
                </div>
                <div className="form-group">
                  <label htmlFor="reg-confirm" className="form-label">Confirm Password <span className="required">*</span></label>
                  <input id="reg-confirm" type="password" className="form-control" placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    autoComplete="new-password" required />
                </div>

                {/* Privacy notice */}
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.875rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem' }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <span>Your complaint details will be processed by authorized AICTE personnel for the purpose of grievance redressal.
                    Personal information will not be publicly exposed. This is a demo system — do not submit real personal data.</span>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input id="reg-privacy" type="checkbox" checked={form.privacy}
                    onChange={e => set('privacy', e.target.checked)} style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', accentColor: 'var(--color-navy)' }} />
                  <span>I have read the privacy notice and agree to the terms of this demonstration system.</span>
                </label>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}
                  disabled={loading} id="register-submit-btn">
                  {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Creating account…</> : <><UserPlus size={16} /> Create Account</>}
                </button>
              </div>
            </form>
          </div>
          <div className="card-footer" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
