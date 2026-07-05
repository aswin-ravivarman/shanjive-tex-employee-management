import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export async function getWagesSummaryData(selectedMonth) {
  const monthVal = dayjs(selectedMonth).month() + 1
  const yearVal = dayjs(selectedMonth).year()
  const startOfMonth = `${yearVal}-${String(monthVal).padStart(2, '0')}-01`
  const endOfMonth = dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD')

  // 1. Fetch active employees & current structures
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select(`
      id, full_name, employee_code,
      employee_salary_structures (
        id,
        basic_salary, 
        is_current,
        employee_salary_components (
          amount, 
          salary_component_types (name),
          advance_settlements (settled_amount)
        )
      )
    `)
    .is('deleted_at', null)
    .eq('status', 'active')

  if (empErr) return { data: null, error: empErr }

  // 2. Fetch all attendance for this month
  const { data: monthAtt, error: attErr } = await supabase
    .from('attendance')
    .select('employee_id, status, shifts!shift_id(name, shift_value)')
    .gte('attendance_date', startOfMonth)
    .lte('attendance_date', endOfMonth)

  if (attErr) return { data: null, error: attErr }

  // 3. Map details
  const mapped = (employees || []).map(emp => {
    // Calculate total duties based on shift multipliers
    let totalDuty = 0
    const empAtt = monthAtt?.filter(a => a.employee_id === emp.id) || []
    empAtt.forEach(att => {
      if (att.status !== 'absent') {
        // Use shift_value directly from DB column
        totalDuty += Number(att.shifts?.shift_value ?? 1.0)
      }
    })

    // Salary structure details: select structure marked is_current
    const activeStruct = emp.employee_salary_structures?.find(s => s.is_current)
      || emp.employee_salary_structures?.find(() => true)
    const fixedSalaryRate = Number(activeStruct?.basic_salary || 0)

    // Calculate advance payouts
    let advancePaid = 0
    if (activeStruct?.employee_salary_components) {
      activeStruct.employee_salary_components.forEach(comp => {
        if (comp.salary_component_types?.name?.toLowerCase().includes('advance')) {
          const totalAmount = Number(comp.amount || 0)
          const settledAmount = (comp.advance_settlements || []).reduce(
            (sum, s) => sum + Number(s.settled_amount || 0), 0
          )
          const outstanding = totalAmount - settledAmount
          if (outstanding > 0) {
            advancePaid += outstanding
          }
        }
      })
    }

    const calculatedSalary = totalDuty * fixedSalaryRate
    const finalPayable = Math.max(0, calculatedSalary - advancePaid)

    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      total_duty: totalDuty,
      salary_fixed: fixedSalaryRate,
      calculated_salary: calculatedSalary,
      advance_paid: advancePaid,
      final_payable: finalPayable
    }
  })

  return { data: mapped, error: null }
}

export async function updateFixedDailySalary(empId, rate) {
  // 1. Fetch current active structure if any
  const { data: existing, error: fetchErr } = await supabase
    .from('employee_salary_structures')
    .select('id')
    .eq('employee_id', empId)
    .eq('is_current', true)
    .maybeSingle()

  if (fetchErr) throw fetchErr

  if (existing) {
    // Update basic salary on existing structure
    const { error: updateErr } = await supabase
      .from('employee_salary_structures')
      .update({ basic_salary: rate })
      .eq('id', existing.id)
    if (updateErr) throw updateErr
  } else {
    // Insert new active structure
    const { error: insertErr } = await supabase
      .from('employee_salary_structures')
      .insert([{
        employee_id: empId,
        basic_salary: rate,
        effective_from: new Date().toISOString().split('T')[0],
        is_current: true
      }])
    if (insertErr) throw insertErr
  }
}
