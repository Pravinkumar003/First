import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/auth'
import logo from '../assets/media/images.png'
const nav = [
  // { to: '/application', label: 'Application Form', icon: 'bi-file-earmark-arrow-down' },
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
    <div className="admin-shell d-grid" style={{ gridTemplateColumns: collapsed ? '88px 1fr' : '280px 1fr' }}>
      <aside className={`sidebar-modern p-3 ${collapsed ? 'collapsed' : ''}`}>
        <div className="d-flex align-items-center justify-content-between mb-3 brand-row">
          <div className="d-flex align-items-center gap-2">
            <img src={logo} alt="Vijayam Logo" className="brand-logo rounded-circle border" />
            <div className="brand-text">
              <div className="heading-font fw-800">Vijayam College of Arts & Science</div>
              <div className="small text-white fw-bold">Chittor</div>
            </div>
          </div>
          <button className="btn btn-sm btn-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
            <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
          </button>
        </div>
        <nav className="d-flex flex-column gap-1 modern-nav">
          {nav.map(n => (
            <Link key={n.to} to={n.to} title={n.label} className={`nav-item-modern ${pathname === n.to ? 'active' : ''}`}>
              <i className={`bi ${n.icon}`}></i>
              <span className="label">{n.label}</span>
            </Link>
          ))}
        </nav>
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
