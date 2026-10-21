'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProfile, updateProfile, type Profile } from '@/lib/api'
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', mobile: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
    })
    getProfile().then(p => {
      setProfile(p)
      setForm({ full_name: p.full_name, mobile: p.mobile || '' })
    }).catch(() => {
      setError('Failed to load profile.')
    }).finally(() => setLoading(false))
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateProfile({
        full_name: form.full_name.trim(),
        mobile: form.mobile || undefined,
      })
      setProfile(updated)
      setSuccess('Profile updated successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(profile?.email || '', {
      redirectTo: `${window.location.origin}/student/profile`,
    })
    setSuccess('Password reset email sent. Check your inbox.')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', minHeight: '60vh' }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="container" style={{ maxWidth: '36rem' }}>
        <h1 style={{ color: 'var(--color-navy)', marginBottom: '0.375rem' }}>
          <User size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Account Settings
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Manage your profile information</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Profile form */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><h2 style={{ margin: 0, fontSize: '1rem' }}>Personal Information</h2></div>
          <div className="card-body">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="prof-name" className="form-label">Full Name</label>
                <input id="prof-name" className="form-control" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} minLength={2} maxLength={120} required />
              </div>
              <div className="form-group">
                <label htmlFor="prof-email" className="form-label">Email Address</label>
                <input id="prof-email" className="form-control" value={profile?.email || ''} readOnly
                  style={{ background: 'var(--color-surface)', cursor: 'not-allowed' }} />
                <span className="form-hint">Email address cannot be changed here.</span>
              </div>
              <div className="form-group">
                <label htmlFor="prof-mobile" className="form-label">Mobile Number <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input id="prof-mobile" type="tel" className="form-control" placeholder="+91 98765 43210"
                  value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} id="save-profile-btn">
                {saving ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Saving…</> : <><Save size={15} /> Save Changes</>}
              </button>
            </form>
          </div>
        </div>

        {/* Password */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><h2 style={{ margin: 0, fontSize: '1rem' }}><Lock size={15} style={{ display: 'inline', marginRight: '0.375rem' }} />Change Password</h2></div>
          <div className="card-body">
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Password changes are handled securely through the authentication provider.
              We'll send a reset link to your registered email.
            </p>
            <button onClick={handleChangePassword} className="btn btn-outline" id="change-password-btn">
              Send Password Reset Email
            </button>
          </div>
        </div>

        {/* Privacy info */}
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0, fontSize: '1rem' }}>Privacy Information</h2></div>
          <div className="card-body" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>
              Your personal information is stored securely and used only for processing your complaints.
              Complaint details are accessible only to you and authorized AICTE processing staff.
              This is a demonstration system — do not submit real sensitive personal data.
            </p>
            <p style={{ margin: '0.75rem 0 0' }}>
              Member since: {profile ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
