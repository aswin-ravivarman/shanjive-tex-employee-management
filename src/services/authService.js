/**
 * authService.js
 * --------------
 * All Supabase authentication calls for the application.
 *
 * Architecture note: This is one of only TWO files allowed to import
 * supabaseClient directly (the other is AuthContext.jsx).
 * All other modules access data through their own service files.
 */

import { supabase } from '@/lib/supabaseClient'

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

/**
 * Sign out the current session.
 * @returns {Promise<{ error: object|null }>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the current active session.
 * Returns null session if no user is logged in.
 * @returns {Promise<{ session: object|null, error: object|null }>}
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// ─────────────────────────────────────────────────────────────
// APP USER (app_users table — the RBAC identity layer)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the app_users row for a given Supabase auth user ID.
 * This is called immediately after resolving a Supabase session to
 * get role, full_name, is_active, must_reset_password, etc.
 *
 * @param {string} authUserId — value of auth.users.id (NOT app_users.id)
 * @returns {Promise<{ appUser: object|null, error: object|null }>}
 */
export async function getCurrentAppUser(authUserId) {
  if (!authUserId) return { appUser: null, error: new Error('No auth user ID provided') }

  const { data, error } = await supabase
    .from('app_users')
    .select('id, auth_user_id, role, full_name, email, is_active, must_reset_password, created_at, custom_permissions')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) {
    console.error('[authService] getCurrentAppUser error:', error.message, error.code)
    return { appUser: null, error }
  }
  return { appUser: data, error: null }
}

/**
 * Update the last_login_at timestamp for the current user.
 * Called silently after a successful sign-in — errors are non-fatal.
 * @param {string} appUserId — app_users.id (UUID)
 * @returns {Promise<void>}
 */
export async function updateLastLogin(appUserId) {
  if (!appUserId) return
  // Intentionally not awaited — fire and forget. A failure here
  // should never block the login flow.
  supabase
    .from('app_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', appUserId)
    .then(({ error }) => {
      if (error) console.warn('[authService] Failed to update last_login_at:', error.message)
    })
}

/**
 * Update custom permissions for an admin user and log the activity.
 * @param {string} adminId — the ID of the admin being updated (app_users.id)
 * @param {string[]} permissions — the new array of permission strings
 * @param {object} logDetails — { permissionKey, action, adminName }
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateAdminPermissions(adminId, permissions, logDetails) {
  const { data, error } = await supabase
    .from('app_users')
    .update({ custom_permissions: permissions })
    .eq('id', adminId)
    .select()
    .single()

  if (error) {
    console.error('[authService] updateAdminPermissions error:', error.message)
    return { data: null, error }
  }

  // Log the activity
  const description = `${logDetails.action === 'grant' ? 'Granted' : 'Revoked'} '${logDetails.permissionKey}' permission for admin ${logDetails.adminName}`
  const { error: logError } = await supabase.rpc('log_activity', {
    p_module: 'settings',
    p_action: 'manage_admin_access',
    p_description: description
  })

  if (logError) {
    console.warn('[authService] Failed to log activity:', logError.message)
  }

  return { data, error: null }
}

/**
 * Fetch role permissions for a given role name.
 */
export async function getRolePermissions(roleName) {
  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permissions (module, action),
      roles!inner (name)
    `)
    .eq('roles.name', roleName)

  return { data, error }
}

/**
 * Update the user's full name in the app_users table
 */
export async function updateUserProfile(appUserId, fullName) {
  const { data, error } = await supabase
    .from('app_users')
    .update({ full_name: fullName })
    .eq('id', appUserId)
    .select()

  return { data, error }
}

/**
 * Update the user's password in auth layer
 */
export async function updateUserPassword(password) {
  const { data, error } = await supabase.auth.updateUser({
    password
  })
  return { data, error }
}
