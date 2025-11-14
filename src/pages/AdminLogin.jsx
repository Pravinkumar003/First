import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/mockApi'
import { useAuth } from '../store/auth'

export default function AdminLogin() {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const nav = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('admin@vijayam.edu')
  const [password, setPassword] = useState('admin123')
  const [role, setRole] = useState('ADMIN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await api.login(email)
      setUser({ email: user.email, role: user.role })
      nav('/admin')
    } catch (err) {
      setError(err.message || 'Unable to sign in right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-live="polite">
        <p className="admin-login-eyebrow">Exam Control Centre</p>
        <h1 className="admin-login-title">Admin login</h1>
        <p className="admin-login-subtitle">
          Sign in with your Vijayam credentials to access the exam management console.
        </p>

        <form className="admin-login-form" onSubmit={onLogin}>
          <label className="admin-login-field">
            <span>Email</span>
            <input
              type="email"
              className="admin-login-input"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="admin-login-field">
            <span>Password</span>
            <input
              type="password"
              className="admin-login-input"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="admin-login-field">
            <span>Login as</span>
            <select
              className="admin-login-input admin-login-select"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="ADMIN">Admin</option>
              <option value="PRINCIPAL">Principal</option>
            </select>
          </label>

          {error && <p className="admin-login-error">{error}</p>}

          <button className="admin-login-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
