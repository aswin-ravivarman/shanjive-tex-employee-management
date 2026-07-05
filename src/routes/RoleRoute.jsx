/**
 * RoleRoute.jsx
 * -------------
 * Guards a route by checking a specific permission key.
 * Must be used inside <ProtectedRoute> (assumes user is already authenticated).
 *
 * Usage:
 *   <Route path="/payroll" element={
 *     <RoleRoute requires="payroll.view">
 *       <PayrollPage />
 *     </RoleRoute>
 *   } />
 *
 * If the user lacks the required permission, they are redirected to /unauthorized.
 * The Sidebar also hides the menu item — this is the fallback for direct URL access.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'

/**
 * @param {{ requires: string, children: React.ReactNode }} props
 */
export default function RoleRoute({ requires, children }) {
  const { loading: authLoading } = useAuth()
  const { hasPermission, permissionsLoading } = usePermission()

  // Wait if authentication or permissions are still loading
  if (authLoading || permissionsLoading) {
    return null
  }

  if (!hasPermission(requires)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
