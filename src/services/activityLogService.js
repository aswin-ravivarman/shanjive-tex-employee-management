import { supabase } from '@/lib/supabaseClient'

/**
 * Log an action into the system activity log.
 * @param {string} module - The module where the action happened (e.g. 'settings', 'employees')
 * @param {string} action - The action type (e.g. 'create_admin', 'update')
 * @param {string} description - Detailed description of the action
 * @param {string|null} authUserId - (Optional) Auth user ID of the person making the action. If not provided, it attempts to pull from the active session.
 */
export async function logActivity(module, action, description, authUserId = null) {
  try {
    let userId = authUserId
    
    // If no userId provided, try to fetch the current user's session
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession()
      userId = session?.user?.id
    }

    if (!userId) {
      console.warn('[activityLogService] Cannot log activity: No active session/user ID.')
      return { error: new Error('No active user session') }
    }

    const { error } = await supabase.rpc('log_activity', {
      p_module: module,
      p_action: action,
      p_description: description,
      p_auth_user_id: userId
    })

    if (error) {
      console.error('[activityLogService] Failed to log activity:', error.message)
      return { error }
    }

    return { error: null }
  } catch (err) {
    console.error('[activityLogService] Exception logging activity:', err.message)
    return { error: err }
  }
}
