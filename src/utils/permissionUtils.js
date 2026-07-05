/**
 * permissionUtils.js
 * ------------------
 * Helpers for working with the permission system.
 *
 * The RBAC model stores permissions as (module, action) pairs in the DB.
 * On the frontend, we combine them as 'module.action' strings (e.g. 'payroll.view').
 * The PermissionContext stores these as a Set<string> for O(1) lookup.
 */

import { PERMISSIONS } from './constants'

/**
 * Build a permission key string from module and action parts.
 * @param {string} module — e.g. 'payroll'
 * @param {string} action — e.g. 'view'
 * @returns {string} e.g. 'payroll.view'
 */
export function buildPermissionKey(module, action) {
  return `${module}.${action}`
}

/**
 * Check if a Set of permission strings contains a given key.
 * Extracted here so it can be used outside React (e.g. in service error handling).
 * @param {Set<string>} permissionsSet — from PermissionContext
 * @param {string} key — e.g. 'employees.delete'
 * @returns {boolean}
 */
export function checkPermission(permissionsSet, key) {
  if (!permissionsSet || !key) return false
  return permissionsSet.has(key)
}

/**
 * Build a full permissions Set from an array of role_permission rows
 * as returned from the Supabase query in PermissionContext.
 *
 * Expected row shape:
 *   { permissions: { module: string, action: string } }
 *
 * @param {Array<{ permissions: { module: string, action: string } }>} rows
 * @returns {Set<string>}
 */
export function buildPermissionsSet(rows) {
  if (!Array.isArray(rows)) return new Set()
  return new Set(
    rows
      .filter(row => row?.permissions?.module && row?.permissions?.action)
      .map(row => buildPermissionKey(row.permissions.module, row.permissions.action))
  )
}

// Re-export PERMISSIONS for convenience so consumers only need one import
export { PERMISSIONS }
