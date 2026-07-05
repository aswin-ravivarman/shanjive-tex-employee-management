/**
 * routes.jsx
 * ----------
 * Full application route configuration using React Router v6.
 *
 * Route structure:
 *   /login                     → AuthLayout → Login (public)
 *   /                          → ProtectedRoute → DashboardLayout
 *     /dashboard               → RoleRoute(dashboard.view) → DashboardPage
 *     /employees               → RoleRoute(employees.view) → EmployeesPage
 *     /attendance              → RoleRoute(attendance.view) → AttendancePage
 *     /leave                   → RoleRoute(leave.view) → LeavePage

 *     /payroll                 → RoleRoute(payroll.view) → PayrollPage
 *     /reports                 → RoleRoute(reports.view_general) → ReportsPage
 *     /settings                → RoleRoute(settings.manage) → SettingsPage
 *     /unauthorized            → Unauthorized (no permission guard needed)
 *   /  (index redirect)        → /dashboard
 *   *  (catch-all)             → /dashboard
 */

import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import AuthLayout      from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'

// Route guards
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute      from '@/routes/RoleRoute'

// Auth pages
import Login from '@/pages/auth/Login'

// Error pages
import Unauthorized from '@/pages/Unauthorized'

// Module pages (stubs replaced module-by-module)
import DashboardPage  from '@/pages/dashboard/DashboardPage'
import EmployeesPage  from '@/pages/employees/EmployeesPage'
import AttendancePage from '@/pages/attendance/AttendancePage'
import LeavePage      from '@/pages/leave/LeavePage'

import PayrollPage    from '@/pages/payroll/PayrollPage'
import AdvancesPage   from '@/pages/payroll/AdvancesPage'
import WagesSummaryPage from '@/pages/payroll/WagesSummaryPage'
import ReportsPage    from '@/pages/reports/ReportsPage'
import SettingsPage   from '@/pages/settings/SettingsPage'

import { PERMISSIONS } from '@/utils/constants'

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── PUBLIC ROUTES ─────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* ── PROTECTED ROUTES ──────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          {/* Index redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <RoleRoute requires={PERMISSIONS.DASHBOARD_VIEW}>
                <DashboardPage />
              </RoleRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <RoleRoute requires={PERMISSIONS.EMPLOYEES_VIEW}>
                <EmployeesPage />
              </RoleRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <RoleRoute requires={PERMISSIONS.ATTENDANCE_VIEW}>
                <AttendancePage />
              </RoleRoute>
            }
          />

          <Route
            path="/leave"
            element={
              <RoleRoute requires={PERMISSIONS.LEAVE_VIEW}>
                <LeavePage />
              </RoleRoute>
            }
          />



          <Route
            path="/payroll"
            element={
              <RoleRoute requires={PERMISSIONS.PAYROLL_VIEW}>
                <PayrollPage />
              </RoleRoute>
            }
          />

          <Route
            path="/advances"
            element={
              <RoleRoute requires={PERMISSIONS.ADVANCES_VIEW}>
                <AdvancesPage />
              </RoleRoute>
            }
          />

          <Route
            path="/wages-summary"
            element={
              <RoleRoute requires={PERMISSIONS.WAGES_SUMMARY_VIEW}>
                <WagesSummaryPage />
              </RoleRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <RoleRoute requires={PERMISSIONS.REPORTS_VIEW_GENERAL}>
                <ReportsPage />
              </RoleRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <RoleRoute requires={PERMISSIONS.SETTINGS_MANAGE}>
                <SettingsPage />
              </RoleRoute>
            }
          />

          {/* 403 page — no permission guard */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Catch-all: redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Route>
      </Route>

    </Routes>
  )
}
