import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '80vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f2d5c 0%, #1a4080 60%, #1a7f7a 100%)', padding: '5rem 1.5rem', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            SMART INDIA HACKATHON 2026 PROTOTYPE
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.2 }}>
            AICTE Smart Complaint<br />Management System
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', maxWidth: '38rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Submit and track complaints regarding technical education institutions.
            AI-powered routing ensures your complaint reaches the right bureau automatically.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-teal btn-lg" id="hero-register-btn">
              Register & Get Started
            </Link>
            <Link href="/login" className="btn btn-outline btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }} id="hero-login-btn">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-navy)', marginBottom: '2.5rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1.25rem' }}>
          {[
            { icon: '📝', title: 'Submit Complaint', desc: 'Fill a structured form with institution details and complaint information. Get a unique Complaint ID.' },
            { icon: '🤖', title: 'AI Routing', desc: 'Our AI engine automatically routes your complaint to the appropriate bureau — RB or PGRC — based on its nature.' },
            { icon: '🔍', title: 'Track Progress', desc: 'Monitor your complaint status in real time through your secure dashboard. Receive notifications at each stage.' },
            { icon: '✅', title: 'Resolution', desc: 'The assigned bureau reviews your complaint and works towards resolution. View the status timeline and outcomes.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.875rem' }}>{f.icon}</div>
              <h3 style={{ color: 'var(--color-navy)', marginBottom: '0.625rem', fontSize: '1.0625rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bureaus */}
        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.25rem' }}>
          {[
            { bureau: 'RB', name: 'Regulation Bureau', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: 'Handles complaints related to regulatory compliance, approvals, NOC, and affiliation matters of technical institutions.' },
            { bureau: 'PGRC', name: 'Public Grievance Redressal Cell', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', desc: 'Addresses student welfare complaints including fees, facilities, academic grievances, and examination-related issues.' },
          ].map(b => (
            <div key={b.bureau} style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: 'var(--radius)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.125rem', color: b.color, background: 'white', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: `1px solid ${b.border}` }}>{b.bureau}</span>
                <span style={{ fontWeight: 700, color: b.color }}>{b.name}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.7 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
