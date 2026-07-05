/**
 * App.jsx
 * -------
 * Application root. Wires together:
 *   - BrowserRouter (React Router)
 *   - AuthProvider (session + app user state)
 *   - PermissionProvider (RBAC permission set)
 *   - ToastContainer (react-toastify notifications)
 *   - AppRoutes (full route tree)
 */

import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider }       from '@/context/AuthContext'
import { PermissionProvider } from '@/context/PermissionContext'
import AppRoutes              from '@/routes/routes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable={false}
            pauseOnHover
            theme="light"
            aria-label="Notifications"
          />
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
