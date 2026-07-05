/**
 * usePermission.js
 * ----------------
 * Convenience hook for consuming PermissionContext.
 *
 * Throws a descriptive error if used outside of <PermissionProvider>.
 *
 * @example
 * const { hasPermission } = usePermission()
 *
 * // Check a single permission
 * const canDelete = hasPermission('employees.delete')
 *
 * // Check with the PERMISSIONS constant (avoids string typos)
 * import { PERMISSIONS } from '@/utils/constants'
 * const canManagePayroll = hasPermission(PERMISSIONS.PAYROLL_MANAGE)
 */

import { useContext } from 'react'
import { PermissionContext } from '@/context/PermissionContext'

export function usePermission() {
  const context = useContext(PermissionContext)

  if (context === undefined) {
    throw new Error(
      'usePermission() must be used inside a <PermissionProvider>.\n' +
      'Make sure <PermissionProvider> wraps your component tree in App.jsx.'
    )
  }

  return context
}
