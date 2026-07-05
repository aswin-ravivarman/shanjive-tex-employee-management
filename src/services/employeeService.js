/**
 * employeeService.js
 * ------------------
 * Handles all database operations for the Employee module.
 * Integrates with departments, designations, shifts, and enforces soft deletes.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Fetch paginated list of employees with optional filters.
 *
 * @param {object} params
 * @param {string} params.search — search query (compares name or employee_code)
 * @param {string} params.department — department name filter
 * @param {string} params.status — employee status filter
 * @param {number} params.rangeFrom — pagination starting offset
 * @param {number} params.rangeTo — pagination ending offset
 * @returns {Promise<{ data: Array|null, count: number, error: object|null }>}
 */
export async function getEmployees({
  search = '',
  department = '',
  status = '',
  rangeFrom = 0,
  rangeTo = 19,
}) {
  let query = supabase
    .from('employees')
    .select(`
      *,
      departments (id, name),
      designations (id, name),
      shifts (id, name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  // 1. Search Query (ILike filter on name or code)
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,employee_code.ilike.%${search}%`)
  }

  // 2. Department filter
  if (department) {
    query = query.eq('department_id', department)
  }

  // 3. Status filter
  if (status) {
    query = query.eq('status', status)
  }

  // 4. Order and pagination range
  query = query
    .order('employee_code', { ascending: true })
    .range(rangeFrom, rangeTo)

  const { data, count, error } = await query

  return { data, count: count || 0, error }
}

/**
 * Fetch a single employee's full details by ID.
 *
 * @param {string} id — UUID
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      departments (id, name),
      designations (id, name),
      shifts (id, name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  return { data, error }
}

/**
 * Create a new employee record.
 * Generates audit log internally.
 *
 * @param {object} employeeData
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createEmployee(employeeData) {
  // Extract created_by from current session user
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  // Get corresponding app_users ID
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  const payload = {
    ...employeeData,
    created_by: appUser?.id,
    updated_by: appUser?.id,
  }

  const { data, error } = await supabase
    .from('employees')
    .insert([payload])
    .select()
    .single()

  if (!error && data) {
    // Log Activity (fire-and-forget)
    supabase.rpc('log_activity', {
      p_module: 'employees',
      p_action: 'create',
      p_description: `Created employee: ${data.full_name} (${data.employee_code})`,
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[employeeService] Failed to log activity:', logErr.message)
    })
  }

  return { data, error }
}

/**
 * Update an existing employee record.
 * Generates audit log internally.
 *
 * @param {string} id — UUID
 * @param {object} employeeData
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateEmployee(id, employeeData) {
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  const payload = {
    ...employeeData,
    updated_by: appUser?.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (!error && data) {
    // Log Activity (fire-and-forget)
    supabase.rpc('log_activity', {
      p_module: 'employees',
      p_action: 'update',
      p_description: `Updated employee: ${data.full_name} (${data.employee_code})`,
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[employeeService] Failed to log activity:', logErr.message)
    })
  }

  return { data, error }
}

/**
 * Soft delete an employee by setting their deleted_at timestamp.
 * Generates audit log internally.
 *
 * @param {string} id — UUID
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteEmployee(id) {
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  // Get employee details first for the audit log
  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, employee_code')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('employees')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: appUser?.id,
    })
    .eq('id', id)

  if (!error && employee) {
    // Log Activity (fire-and-forget)
    supabase.rpc('log_activity', {
      p_module: 'employees',
      p_action: 'delete',
      p_description: `Soft deleted employee: ${employee.full_name} (${employee.employee_code})`,
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[employeeService] Failed to log activity:', logErr.message)
    })
  }

  return { error }
}

// ─────────────────────────────────────────────────────────────
// METADATA FETCHING (for dropdown select options in forms)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all active departments.
 */
export async function getActiveDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return { data, error }
}

/**
 * Fetch all active designations.
 */
export async function getActiveDesignations() {
  const { data, error } = await supabase
    .from('designations')
    .select('id, name, department_id')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return { data, error }
}

/**
 * Fetch all active shifts.
 */
export async function getActiveShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return { data, error }
}
