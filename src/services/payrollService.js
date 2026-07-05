/**
 * payrollService.js
 * ------------------
 * Handles monthly payroll runs, salary calculations, payslip generation, and transitions.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Fetch list of past monthly payroll cycles with aggregated stats.
 * Uses the payroll_monthly_summary view.
 *
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getPayrollRuns() {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select(`
      id,
      month,
      year,
      status,
      start_date,
      end_date,
      payslips (
        gross_salary,
        total_deductions,
        net_salary
      )
    `)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    return { data: null, error }
  }

  const mapped = (data || []).map(run => {
    const slips = run.payslips || []
    const total_gross = slips.reduce((sum, s) => sum + Number(s.gross_salary || 0), 0)
    const total_deductions = slips.reduce((sum, s) => sum + Number(s.total_deductions || 0), 0)
    const total_net = slips.reduce((sum, s) => sum + Number(s.net_salary || 0), 0)

    return {
      id: run.id,
      month: run.month,
      year: run.year,
      status: run.status,
      start_date: run.start_date,
      end_date: run.end_date,
      employees_paid: slips.length,
      total_gross,
      total_deductions,
      total_net
    }
  })

  return { data: mapped, error: null }
}

/**
 * Generate a new monthly payroll run.
 * Creates payslips for all active employees by querying active salary structures
 * and today's attendance logs for overtime / working days.
 *
 * @param {number} month — 1-12
 * @param {number} year
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function generatePayrollRun(month, year, startDate = null, endDate = null) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const authUserId = session?.user?.id

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    // Define query dates
    let finalStartDate = startDate
    let finalEndDate = endDate

    if (!finalStartDate || !finalEndDate) {
      finalStartDate = `${year}-${String(month).padStart(2, '0')}-01`
      finalEndDate = new Date(year, month, 0).toISOString().split('T')[0]
    }

    // 1. Create the payroll_runs row in 'draft' status
    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .insert([{
        month,
        year,
        start_date: finalStartDate,
        end_date: finalEndDate,
        status: 'draft',
        generated_by: appUser?.id
      }])
      .select()
      .single()

    if (runErr) throw runErr

    // 2. Fetch all active employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, full_name, status')
      .is('deleted_at', null)
      .eq('status', 'active')

    if (empErr) throw empErr

    const payslipsPayload = []

    // Calculate total days in range
    const totalDaysInRange = dayjs(finalEndDate).diff(dayjs(finalStartDate), 'day') + 1

    // 3. For each active employee, fetch their salary structure and calculate components
    for (const emp of employees) {
      // Fetch current salary structure (basic_salary here represents the "Per Day Rate" for textile workers)
      const { data: struct } = await supabase
        .from('employee_salary_structures')
        .select(`
          id,
          basic_salary,
          employee_salary_components (
            amount,
            salary_component_types (id, name, kind),
            advance_settlements (settled_amount)
          )
        `)
        .eq('employee_id', emp.id)
        .eq('is_current', true)
        .maybeSingle()

      const perDayRate = Number(struct?.basic_salary || 0)
      let advanceDeduction = 0

      // Calculate advance deductions from salary components
      if (struct?.employee_salary_components) {
        struct.employee_salary_components.forEach(comp => {
          if (comp.salary_component_types?.name?.toLowerCase().includes('advance')) {
            const totalAmount = Number(comp.amount || 0)
            const settledAmount = (comp.advance_settlements || []).reduce(
              (sum, s) => sum + Number(s.settled_amount || 0), 0
            )
            const outstanding = totalAmount - settledAmount
            if (outstanding > 0) {
              advanceDeduction += outstanding
            }
          }
        })
      }

      // Fetch employee attendance for this custom date range
      const { data: attendance } = await supabase
        .from('attendance')
        .select(`
          status,
          shifts (name, shift_value)
        `)
        .eq('employee_id', emp.id)
        .gte('attendance_date', finalStartDate)
        .lte('attendance_date', finalEndDate)

      // Calculate equivalent working days based on shift multipliers
      let totalDaysWorked = 0
      let presentDaysCount = 0

      if (attendance) {
        attendance.forEach(att => {
          if (att.status === 'present' || att.status === 'half_day') {
            presentDaysCount++
            // Use shift_value directly from DB column — no hardcoded names
            totalDaysWorked += Number(att.shifts?.shift_value ?? 1.0)
          }
        })
      }

      // Gross Payout = total equivalent days worked * per day rate
      const grossSalary = Math.round(totalDaysWorked * perDayRate)

      payslipsPayload.push({
        payroll_run_id: run.id,
        employee_id: emp.id,
        basic_salary: perDayRate, // stores per day rate for reference
        total_allowances: 0,
        total_deductions: advanceDeduction,
        overtime_amount: 0,
        bonus_amount: 0,
        working_days: totalDaysWorked, // stores total equivalent days worked
        present_days: presentDaysCount,
        leave_days: Math.max(0, totalDaysInRange - presentDaysCount)
      })
    }

    // 4. Insert all payslips in a single batch
    if (payslipsPayload.length > 0) {
      const { error: slipErr } = await supabase
        .from('payslips')
        .insert(payslipsPayload)

      if (slipErr) throw slipErr
    }

    // 5. Update status of run to 'processed'
    const { data: processedRun, error: updateErr } = await supabase
      .from('payroll_runs')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', run.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Log Activity via DB RPC function
    supabase.rpc('log_activity', {
      p_module: 'payroll',
      p_action: 'create',
      p_description: `Processed payroll cycle for ${month}/${year}`
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('[payrollService] Failed to log activity:', logErr.message)
    })

    return { data: processedRun, error: null }
  } catch (error) {
    console.error('[payrollService] Failed to generate payroll:', error.message)
    return { data: null, error }
  }
}

/**
 * Lock a payroll run to finalize figures.
 *
 * @param {string} runId — UUID
 * @returns {Promise<{ error: object|null }>}
 */
export async function lockPayrollRun(runId) {
  const { error } = await supabase
    .from('payroll_runs')
    .update({ status: 'locked' })
    .eq('id', runId)

  if (!error) {
    supabase.rpc('log_activity', {
      p_module: 'payroll',
      p_action: 'update',
      p_description: `Locked payroll run ID ${runId}`
    })
  }

  return { error }
}

/**
 * Mark a payroll run as paid (disburses salaries).
 *
 * @param {string} runId — UUID
 * @returns {Promise<{ error: object|null }>}
 */
export async function markPayrollPaid(runId) {
  const { error } = await supabase
    .from('payroll_runs')
    .update({ status: 'paid' })
    .eq('id', runId)

  if (!error) {
    supabase.rpc('log_activity', {
      p_module: 'payroll',
      p_action: 'update',
      p_description: `Disbursed salaries for payroll run ID ${runId}`
    })
  }

  return { error }
}

/**
 * Fetch all payslips generated inside a payroll run.
 *
 * @param {string} runId — UUID
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getPayslipsForRun(runId) {
  const { data, error } = await supabase
    .from('payslips')
    .select(`
      *,
      employees (
        full_name,
        employee_code,
        departments (name)
      )
    `)
    .eq('payroll_run_id', runId)
    .order('gross_salary', { ascending: false })

  return { data, error }
}
