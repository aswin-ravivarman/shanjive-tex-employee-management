/**
 * PermissionContext.jsx
 * ---------------------
 * Loads role-based permissions from the database and exposes
 * a fast O(1) hasPermission() check to the entire component tree.
 *
 * Flow:
 *  1. Watches appUser from AuthContext.
 *  2. When appUser is set, queries role_permissions JOIN permissions
 *     for the user's role.
 *  3. Builds a Set<string> of 'module.action' keys (e.g. 'payroll.view').
 *  4. Exposes { permissions: Set, hasPermission: (key) => boolean }.
 *
 * RBAC note: The database seeds all permissions for super_admin.
 * Even if the query returns a full set, payroll/settings tables are
 * protected at the RLS layer — UI permission checks are a secondary guard.
 */

import { createContext, useState, useEffect, useCallback } from 'react'
import { getRolePermissions } from '@/services/authService'
import { useAuth } from '@/hooks/useAuth'
import { buildPermissionsSet } from '@/utils/permissionUtils'

export const PermissionContext = createContext(undefined)

// Default hardcoded permissions for standard Admin role to bypass potential DB seed gaps
const DEFAULT_ADMIN_PERMISSIONS = new Set([
  'dashboard.view',
  'employees.view',
  'employees.create',
  'employees.edit',
  'employees.delete',
  'attendance.view',
  'attendance.manage',
  'leave.view',
  'leave.manage',

  'stock.view',
  'stock.manage',
  'reports.view_general',
  'reports.view_attendance',
  'reports.view_leaves',
  'reports.view_duty_summary'
])

export function PermissionProvider({ children }) {
  const { appUser, loading: authLoading } = useAuth()
  const [permissions, setPermissions] = useState(new Set())
  const [permissionsLoading, setPermissionsLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // LOAD PERMISSIONS when appUser role is available
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // If Auth is still loading session, we are definitely loading permissions
    if (authLoading) {
      setPermissionsLoading(true)
      return
    }

    if (!appUser?.role) {
      // Signed out — clear permissions
      setPermissions(new Set())
      setPermissionsLoading(false)
      return
    }

    let isMounted = true

    async function loadPermissions() {
      setPermissionsLoading(true)
      try {
        const { data, error } = await getRolePermissions(appUser.role)

        if (error) {
          console.error('[PermissionContext] Failed to load permissions:', error.message)
          setPermissions(new Set())
          return
        }

        if (isMounted) {
          const permSet = buildPermissionsSet(data)
          setPermissions(permSet)
        }
      } catch (err) {
        console.error('[PermissionContext] Unexpected error loading permissions:', err)
        setPermissions(new Set())
      } finally {
        if (isMounted) setPermissionsLoading(false)
      }
    }

    loadPermissions()

    return () => { isMounted = false }
  }, [appUser?.role])

  // ─────────────────────────────────────────────────────────────
  // hasPermission — O(1) Set lookup
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if the current user has a specific permission.
   * @param {string} permissionKey — e.g. 'payroll.view' or PERMISSIONS.PAYROLL_VIEW
   * @returns {boolean}
   */
  const hasPermission = useCallback((permissionKey) => {
    if (!permissionKey) return false
    
    // Super Admin always has full access
    if (appUser?.role === 'super_admin') {
      return true
    }
    
    // Hard restrictions for admin role: block payroll, payroll reports, and settings modules
    if (appUser?.role === 'admin') {
      // If user-specific custom_permissions exist, use them
      if (appUser.custom_permissions && Array.isArray(appUser.custom_permissions)) {
        // If checking reports.view_general, return true if they have any specific report view permissions
        if (permissionKey === 'reports.view_general') {
          return (
            appUser.custom_permissions.includes('reports.view_general') ||
            appUser.custom_permissions.includes('reports.view_attendance') ||
            appUser.custom_permissions.includes('reports.view_leaves') ||
            appUser.custom_permissions.includes('reports.view_duty_summary') ||
            appUser.custom_permissions.includes('reports.view_payroll')
          )
        }
        return appUser.custom_permissions.includes(permissionKey)
      }

      // Legacy fallback when custom_permissions is not set
      const isPayroll = permissionKey.startsWith('payroll.') || permissionKey.startsWith('advances.') || permissionKey.startsWith('wages_summary.')
      const isPayrollReport = permissionKey === 'reports.view_payroll'
      const isSettings = permissionKey.startsWith('settings.') || permissionKey.startsWith('admin_management.')
      if (isPayroll || isPayrollReport || isSettings) {
        return false
      }

      // Default fallback for admin role
      if (DEFAULT_ADMIN_PERMISSIONS.has(permissionKey)) {
        return true
      }
    }
    
    return permissions.has(permissionKey)
  }, [permissions, appUser])

  const value = {
    permissions,        // Set<string> of 'module.action' keys
    permissionsLoading, // true while loading (rarely needed in UI)
    hasPermission,      // (key: string) => boolean
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}
