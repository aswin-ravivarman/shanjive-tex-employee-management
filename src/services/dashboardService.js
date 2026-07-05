/**
 * dashboardService.js
 * -------------------
 * Fetches aggregated statistics and recent activity logs for the dashboard.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Fetch overview totals for the metric cards.
 * Combines active employee counts, today's attendance, and low stock warnings.
 *
 * @returns {Promise<{ stats: object|null, error: object|null }>}
 */
export async function getDashboardStats() {
  try {
    // 1. Get employee counts
    const { data: empData, error: empErr } = await supabase
      .from('dashboard_employee_totals')
      .select('*')
      .single()

    if (empErr) throw empErr

    // 2. Get today's attendance counts
    const { data: attData, error: attErr } = await supabase
      .from('dashboard_attendance_today')
      .select('*')
      .single()

    if (attErr) throw attErr

    // 4. Get active leave cases (leaves active today)
    const todayStr = new Date().toISOString().split('T')[0]
    const { count: activeLeaves, error: leaveErr } = await supabase
      .from('leave_records')
      .select('*', { count: 'exact', head: true })
      .gte('end_date', todayStr)
      .lte('start_date', todayStr)

    if (leaveErr) throw leaveErr

    // 5. Get Shift Distribution for today
    const { data: shiftAtt, error: shiftErr } = await supabase
      .from('attendance')
      .select('shifts (name)')
      .eq('attendance_date', todayStr)
      .in('status', ['present', 'half_day'])

    if (shiftErr) throw shiftErr

    // Aggregate shift counts
    const shiftDistribution = {}
    shiftAtt?.forEach(record => {
      const shiftName = record.shifts?.name || 'Unknown Shift'
      shiftDistribution[shiftName] = (shiftDistribution[shiftName] || 0) + 1
    })

    return {
      stats: {
        activeEmployees: empData?.active_employees || 0,
        totalEmployees: empData?.total_employees || 0,
        attendanceToday: {
          present: attData?.present_count || 0,
          absent: attData?.absent_count || 0,
          halfDay: attData?.half_day_count || 0,
          leave: attData?.leave_count || 0
        },
        activeLeaves: activeLeaves || 0,
        shiftDistribution,
        lowStockAlerts: 0
      },
      error: null
    }
  } catch (error) {
    console.error('[dashboardService] Failed to load dashboard stats:', error.message)
    return { stats: null, error }
  }
}

/**
 * Fetch the latest 5 activity logs.
 *
 * @returns {Promise<{ logs: Array|null, error: object|null }>}
 */
export async function getRecentActivityLogs() {
  try {
    // 1. Fetch general logs (non-attendance)
    const { data: generalLogs, error: genErr } = await supabase
      .from('activity_logs')
      .select(`
        id,
        module,
        action,
        description,
        occurred_at,
        app_users (
          full_name,
          role
        )
      `)
      .neq('module', 'attendance')
      .order('occurred_at', { ascending: false })
      .limit(10)

    if (genErr) throw genErr

    // 2. Fetch attendance logs
    const { data: attendanceLogs, error: attErr } = await supabase
      .from('activity_logs')
      .select(`
        id,
        module,
        action,
        description,
        occurred_at,
        app_users (
          full_name,
          role
        )
      `)
      .eq('module', 'attendance')
      .order('occurred_at', { ascending: false })
      .limit(10)

    if (attErr) throw attErr

    return { logs: { generalLogs, attendanceLogs }, error: null }
  } catch (error) {
    console.error('[dashboardService] Failed to load activity logs:', error)
    return { logs: null, error }
  }
}
