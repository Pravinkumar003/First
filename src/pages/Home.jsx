import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/mockApi'
import { useAuth } from '../store/auth'
import logo from './images.png'

export default function Home() {
  const nav = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('admin@vijayam.edu')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('ADMIN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { const u = await api.login(email); setUser({ email: u.email, role: u.role }); nav('/admin/setup/years') }
    catch (err) { setError(err.message || 'Login failed') } finally { setLoading(false) }
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white py-3 border-bottom">
        <div className="container d-flex align-items-center gap-3">
          <img src={logo} alt="Vijayam Logo" className="brand-logo" />
          <div>
            <div className="fs-3 fw-bold text-brand">VIJAYAM Science and Arts Degree College</div>
            <div className="text-muted small">Affiliated to S.V. University, Tirupati & Recognized by Govt of A.P. | Accredited by NAAC with A+ Grade</div>
            <div className="fw-bold text-primary">AUTONOMOUS</div>
          </div>
        </div>
      </header>

      {/* Hero - 50/50 layout */}
      <section className="container py-4">
        <div className="hero-frame p-2">
          <div className="hero-canvas rounded-4 position-relative overflow-hidden">
            <div className="hero-blob-1"></div>
            <div className="hero-blob-2"></div>

            <div className="hero-inner p-3 p-md-4 p-lg-5">
              <div className="glass-card p-4 p-md-5 h-100">
                <div className="heading-font fs-2 fw-700 mb-2">Unlock Your Academic Journey</div>
                <div className="text-muted">Apply, track results, and view exam schedules — all in one simple portal for students.</div>
                <div className="mt-3 d-grid gap-3" style={{maxWidth:'520px'}}>
                  <Link to="/application" className="home-cta brand w-100">Application Form</Link>
                  <Link to="/public/results" className="home-cta brand w-100">Exam Result</Link>
                  <Link to="/public/timetable" className="home-cta brand w-100">Exam Time Table</Link>
                </div>
              </div>
              <div className="card card-soft p-4 h-100">
                <div className="fw-600 mb-2">Admin / Principal Login</div>
                <form onSubmit={onLogin}>
                  <div className="mb-2"><label className="form-label small">Email</label><input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
                  <div className="mb-2"><label className="form-label small">Password</label><input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
                  <div className="mb-3"><label className="form-label small">Login as</label><select className="form-select" value={role} onChange={e=>setRole(e.target.value)}><option value="ADMIN">Admin</option><option value="PRINCIPAL">Principal</option></select></div>
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <button className="btn btn-brand w-100" disabled={loading}>{loading?'Signing in...':'Sign In'}</button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
