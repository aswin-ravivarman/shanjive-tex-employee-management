/**
 * ProtectedRoute.jsx
 * ------------------
 * Wraps routes that require an authenticated session.
 * Redirects to /login if no user is present.
 * Shows a full-screen loading state while the session is being resolved.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import './ProtectedRoute.css'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show a full-screen loader while AuthContext resolves the session.
  // Without this, there is a flash of the login page on every page refresh
  // for authenticated users.
  if (loading) {
    return (
      <div className="protected-loading" aria-label="Loading application…">
        <div className="protected-loading-inner">
          <div className="protected-loading-logo">
            <span>ST</span>
          </div>
          <div className="protected-loading-spinner" aria-hidden="true"></div>
          <p className="protected-loading-text">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Not authenticated — redirect to login and remember where the user was trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Authenticated — render the child route
  return <Outlet />
}
