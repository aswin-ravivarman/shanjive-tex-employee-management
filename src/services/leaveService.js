/**
 * leaveService.js
 * ----------------
 * Handles leave records logging, leave types lookup, and balance queries.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Fetch leave records with optional filters.
 *
 * @param {object} params
 * @param {string} params.search — search query matching employee name or code
 * @param {string} params.leaveTypeId — filter by leave type UUID
 * @param {number} params.rangeFrom — pagination starting offset
 * @param {number} params.rangeTo — pagination ending offset
 * @returns {Promise<{ data: Array|null, count: number, error: object|null }>}
 */
export async function getLeaveRecords({
  search = '',
  leaveTypeId = '',
  rangeFrom = 0,
  rangeTo = 9,
}) {
  let query = supabase
    .from('leave_records')
    .select(`
      *,
      employees!inner (id, full_name, employee_code, departments(id, name)),
      leave_types (id, name, is_paid)
    `, { count: 'exact' })

  // 1. Search Query
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,employee_code.ilike.%${search}%`, { foreignTable: 'employees' })
  }

  // 2. Leave Type filter
  if (leaveTypeId) {
    query = query.eq('leave_type_id', leaveTypeId)
  }

  // 3. Order and Paginate
  query = query
    .order('start_date', { ascending: false })
    .range(rangeFrom, rangeTo)

  const { data, count, error } = await query

  return { data, count: count || 0, error }
}

/**
 * Record a new leave entry.
 * Recalculates Used Days automatically via DB trigger (trg_recalc_leave_balance).
 *
 * @param {object} leaveData
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createLeaveRecord(leaveData) {
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  const payload = {
    ...leaveData,
    recorded_by: appUser?.id
  }

  const { data, error } = await supabase
    .from('leave_records')
    .insert([payload])
    .select()
    .single()

  if (!error && data) {
    // Log Activity (fire-and-forget)
    supabase.rpc('log_activity', {
      p_module: 'leave',
      p_action: 'create',
      p_description: `Recorded leave entry for employee ID ${payload.employee_id} (${payload.total_days} days)`
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[leaveService] Failed to log activity:', logErr.message)
    })
  }

  return { data, error }
}

/**
 * Fetch all active leave types.
 */
export async function getLeaveTypes() {
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name, default_annual_quota, is_paid')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return { data, error }
}

/**
 * Fetch leave balances for a specific employee.
 * Combines allocation quotas and used days.
 *
 * @param {string} employeeId — UUID
 * @param {number} year — defaults to current year
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getEmployeeLeaveBalances(employeeId, year = new Date().getFullYear()) {
  const { data, error } = await supabase
    .from('employee_leave_balances')
    .select(`
      id,
      allocated_days,
      used_days,
      leave_types (id, name, is_paid)
    `)
    .eq('employee_id', employeeId)
    .eq('year', year)

  return { data, error }
}

/**
 * Fetch active employees (simple list for form dropdowns).
 */
export async function getActiveEmployeesList() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, employee_code')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  return { data, error }
}
