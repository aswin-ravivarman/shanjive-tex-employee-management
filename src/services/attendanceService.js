/**
 * attendanceService.js
 * --------------------
 * Handles daily attendance logging, shift checks, and monthly calendars.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Fetch daily attendance records for all active employees for a given date.
 * If an employee does not have a record for this date, we return a draft/default
 * record initialized with their default shift.
 *
 * @param {string} dateStr — ISO date format (YYYY-MM-DD)
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getAttendanceForDate(dateStr) {
  try {
    // 1. Fetch all active employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, full_name, employee_code, default_shift_id, shifts(id, name, start_time, end_time)')
      .is('deleted_at', null)
      .eq('status', 'active')

    if (empErr) throw empErr

    // 2. Fetch existing attendance records for this date
    const { data: attendance, error: attErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('attendance_date', dateStr)

    if (attErr) throw attErr

    // Create a lookup map of existing attendance
    const attendanceMap = new Map(attendance.map(a => [a.employee_id, a]))

    // 3. Merge lists: if no attendance record exists, initialize a default present draft row
    const merged = employees.map(emp => {
      const existing = attendanceMap.get(emp.id)
      if (existing) {
        return {
          ...existing,
          employee: {
            full_name: emp.full_name,
            employee_code: emp.employee_code
          },
          shift: emp.shifts
        }
      }

      // Default draft row initialized to Present + Default Shift
      return {
        id: null, // Indicates draft record (needs insert)
        employee_id: emp.id,
        attendance_date: dateStr,
        status: 'present',
        shift_id: emp.default_shift_id,
        check_in_time: emp.shifts?.start_time ? `${dateStr}T${emp.shifts.start_time}` : null,
        check_out_time: emp.shifts?.end_time ? `${dateStr}T${emp.shifts.end_time}` : null,
        working_hours: null,
        overtime_hours: 0,
        is_late_arrival: false,
        is_early_exit: false,
        remarks: '',
        employee: {
          full_name: emp.full_name,
          employee_code: emp.employee_code
        },
        shift: emp.shifts
      }
    })

    return { data: merged, error: null }
  } catch (error) {
    console.error('[attendanceService] Failed to load attendance:', error.message)
    return { data: null, error }
  }
}

/**
 * Save a single attendance record (Inserts if new, Updates if exists).
 *
 * @param {object} record — attendance row object
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function saveAttendance(record) {
  const { data: { session } } = await supabase.auth.getSession()
  const authUserId = session?.user?.id

  // Get corresponding app_users ID
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  const payload = {
    employee_id:     record.employee_id,
    attendance_date: record.attendance_date,
    status:          record.status,
    shift_id:        record.shift_id,
    check_in_time:   record.status === 'present' || record.status === 'half_day' ? record.check_in_time : null,
    check_out_time:  record.status === 'present' || record.status === 'half_day' ? record.check_out_time : null,
    remarks:         record.remarks || '',
    updated_by:      appUser?.id,
    updated_at:      new Date().toISOString()
  }

  let result
  if (record.id) {
    // Update existing
    result = await supabase
      .from('attendance')
      .update(payload)
      .eq('id', record.id)
      .select()
      .single()
  } else {
    // Insert new
    payload.created_by = appUser?.id
    result = await supabase
      .from('attendance')
      .insert([payload])
      .select()
      .single()
  }

  if (!result.error && result.data) {
    // Log Activity (fire-and-forget)
    supabase.rpc('log_activity', {
      p_module: 'attendance',
      p_action: record.id ? 'update' : 'create',
      p_description: `Marked attendance for ${record.employee.full_name}: ${record.status.toUpperCase()} on ${record.attendance_date}`
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[attendanceService] Failed to log activity:', logErr.message)
    })
  }

  return { data: result.data, error: result.error }
}

/**
 * Fetch monthly attendance statistics for a single employee.
 * Used to render attendance summary grids.
 *
 * @param {string} employeeId — UUID
 * @param {number} month — 1-12
 * @param {number} year
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getEmployeeAttendanceSummary(employeeId, month, year) {
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance')
    .select('attendance_date, status, working_hours, overtime_hours')
    .eq('employee_id', employeeId)
    .gte('attendance_date', startOfMonth)
    .lte('attendance_date', endOfMonth)

  return { data, error }
}

/**
 * Force fetch all attendance records between start and end dates for specific employees
 */
export async function getAttendanceForEmployees(startDate, endDate, employeeIds) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .in('employee_id', employeeIds)

  return { data, error }
}

/**
 * Fetch shifts including shift_value (used for duty calculation)
 */
export async function getShiftsWithValues() {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, name, shift_value')
    .order('shift_value')

  return { data, error }
}
