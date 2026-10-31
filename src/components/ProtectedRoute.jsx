import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="text-muted">Wird geladen…</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (requireRole && profile?.role !== requireRole) {
    return (
      <div className="page-content">
        <div className="alert alert-error">
          Diese Seite ist nur für {requireRole === 'bewerter' ? 'Bewerter' : 'Lehrpersonen'} zugänglich.
        </div>
      </div>
    )
  }

  return children
}
