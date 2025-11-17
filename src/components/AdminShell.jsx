import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/auth'
import logo from '../assets/media/images.png'
const nav = [
  { to: '/admin/applications', label: 'Exam Applications', icon: 'bi-inboxes' },
  { to: '/admin/setup/years', label: 'Create Academic Years', icon: 'bi-calendar3' },
  { to: '/admin/setup/groups', label: 'Create Groups & Courses', icon: 'bi-diagram-3' },
  { to: '/admin/setup/subcats', label: 'Create Sub-categories', icon: 'bi-list-ul' },
  { to: '/admin/setup/subjects', label: 'Create Subjects', icon: 'bi-journal-text' },
  { to: '/admin/departments', label: 'Fees Generation', icon: 'bi-mortarboard' },
  { to: '/admin/batches', label: 'Batches', icon: 'bi-people' },
  { to: '/admin/courses', label: 'View Courses', icon: 'bi-book' },
  { to: '/admin/students', label: 'Students Details', icon: 'bi-person-badge' },
  { to: '/admin/exams', label: 'Create Exam Time Table', icon: 'bi-journal-check' },
  { to: '/admin/payments', label: 'Payments', icon: 'bi-credit-card' },
  { to: '/admin/hall-tickets', label: 'Hall Tickets', icon: 'bi-ticket-perforated' },
  { to: '/admin/results', label: 'Results', icon: 'bi-award' }
]

export default function AdminShell({ children, onSignOut }) {
  const { pathname } = useLocation()
  const navTo = useNavigate()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const handleSignOut = () => {
    if (typeof onSignOut === 'function') {
      onSignOut()
    } else {
      try { signOut() } catch {}
    }
    navTo('/')
  }

  return (
    <div className="admin-shell d-grid" style={{ gridTemplateColumns: collapsed ? '92px 1fr' : '280px 1fr' }}>
      <aside className={`sidebar-modern d-flex flex-column ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand d-flex align-items-center gap-2">
            <img src={logo} alt="Vijayam Logo" className="brand-logo shadow-sm" />
            <div className="sidebar-brand-info">
              <div className="heading-font fw-600">Vijayam College</div>
              <small className="sidebar-brand-subtitle text-uppercase">Arts & Science · Chittor</small>
            </div>
          </div>
          <button
            className="btn btn-sm btn-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
          </button>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav flex-grow-1 d-flex flex-column gap-1">
          {nav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={`nav-item-modern ${pathname === item.to ? 'active' : ''}`}
            >
              <span className="icon">
                <i className={`bi ${item.icon}`}></i>
              </span>
              <span className="label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer text-center small text-muted mt-auto">
          <div>Exam Management Studio</div>
          <div>Crafted for Vijayam College</div>
        </div>
      </aside>

      <main className="admin-main p-4">
        <div className="brandbar rounded px-3 py-2 mb-3 d-flex align-items-center justify-content-between header-shadow">
          <div className="brandbar-title">Exam Management System</div>
          <button className="btn btn-outline-secondary modern-signout" onClick={handleSignOut} title="Sign out">
            <i className="bi bi-box-arrow-right me-2"></i>Sign out
          </button>
        </div>
        <div className="admin-main-scroll">
          {children}
        </div>
      </main>
    </div>
  )
}
