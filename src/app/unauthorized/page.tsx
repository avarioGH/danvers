import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,51,102,0.1) 0%, rgba(2,4,8,1) 60%)',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }} className="animate-fade-scale">
        <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(255,51,102,0.2)' }}>
          <ShieldAlert size={36} style={{ color: '#ff3366' }} />
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 800, color: '#ff3366', letterSpacing: '0.1em', textShadow: '0 0 20px rgba(255,51,102,0.5)' }}>
          ACCESS DENIED
        </h1>
        <p style={{ color: '#8bacc8', marginTop: 12, fontSize: 15 }}>
          Your account is not authorized to access DANVERS OS. This system is restricted to approved personnel only.
        </p>
        <Link href="/login" className="btn-secondary" style={{ marginTop: 24, display: 'inline-flex' }}>
          Return to Login
        </Link>
      </div>
    </div>
  )
}
