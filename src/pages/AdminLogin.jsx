import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/mockApi'
import { useAuth } from '../store/auth'

export default function AdminLogin() {
  const nav = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('admin@vijayam.edu')
  const [password, setPassword] = useState('admin123')
  const [role, setRole] = useState('ADMIN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const onLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { const u = await api.login(email); setUser({ email: u.email, role: u.role }); nav('/admin') }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card card-soft p-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <img src="/logo-placeholder.png" className="brand-logo" alt="logo" />
              <div><h4 className="fw-bold mb-0">Vijayam College</h4><div className="text-muted">Chennai</div></div>
            </div>
            <h5>Admin / Principal Login</h5>
            <form onSubmit={onLogin} className="mt-3">
              <div className="mb-3"><label className="form-label">Email</label><input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
              <div className="mb-3"><label className="form-label">Password</label><input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
              <div className="mb-3"><label className="form-label">Login as</label><select className="form-select" value={role} onChange={e=>setRole(e.target.value)}><option value="ADMIN">Admin</option><option value="PRINCIPAL">Principal</option></select></div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button className="btn btn-brand w-100" disabled={loading}>{loading?'Signing in...':'Sign In'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
