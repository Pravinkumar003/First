import { Navigate } from 'react-router-dom'
export default function GuardedRoute({ isAuthed, children }) {
  if (!isAuthed) return <Navigate to="/admin/login" replace />
  return children
}
