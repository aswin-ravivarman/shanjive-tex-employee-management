import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export async function getReportCompanySettings() {
  return supabase.from('company_settings').select('*').maybeSingle()
}

export async function getReportEmployees() {
  return supabase
    .from('employees')
    .select('id, full_name')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name')
}

export async function getReportAttendance(startDate, endDate, deptId) {
  let query = supabase
    .from('attendance')
    .select(`
      id,
      attendance_date,
      status,
      remarks,
      employees!inner (
        full_name,
        employee_code,
        department_id,
        departments (name)
      ),
      shifts (name)
    `)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)

  if (deptId) {
    query = query.eq('employees.department_id', deptId)
  }

  const { data, error } = await query
  
  if (error) return { data: null, error }

  const filtered = (data || []).filter(item => item.employees)
  filtered.sort((a, b) => {
    const dateA = new Date(a.attendance_date).getTime()
    const dateB = new Date(b.attendance_date).getTime()
    if (dateA !== dateB) return dateA - dateB
    
    const codeA = a.employees?.employee_code || ''
    const codeB = b.employees?.employee_code || ''
    return codeA.localeCompare(codeB)
  })

  return { data: filtered, error: null }
}

export async function getReportWages(selectedMonth, deptId) {
  const monthVal = dayjs(selectedMonth).month() + 1
  const yearVal = dayjs(selectedMonth).year()
  const startOfMonth = `${yearVal}-${String(monthVal).padStart(2, '0')}-01`
  const endOfMonth = dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD')

  let empQuery = supabase
    .from('employees')
    .select(`
      id, full_name, employee_code, department_id,
      departments (name),
      employee_salary_structures (
        basic_salary,
        employee_salary_components (
          amount,
          salary_component_types (name),
          advance_settlements (settled_amount)
        )
      )
    `)
    .is('deleted_at', null)

  if (deptId) {
    empQuery = empQuery.eq('department_id', deptId)
  }

  const { data: employees, error: empErr } = await empQuery
  if (empErr) return { data: null, error: empErr }

  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('employee_id, status, shifts!shift_id(shift_value)')
    .gte('attendance_date', startOfMonth)
    .lte('attendance_date', endOfMonth)

  if (attErr) return { data: null, error: attErr }

  const wagesReport = (employees || []).map(emp => {
    let totalDuty = 0
    const empAtt = attendance?.filter(a => a.employee_id === emp.id) || []
    empAtt.forEach(att => {
      if (att.status !== 'absent') {
        totalDuty += Number(att.shifts?.shift_value ?? 1.0)
      }
    })

    const activeStruct = emp.employee_salary_structures?.find(() => true)
    const fixedSalaryRate = Number(activeStruct?.basic_salary || 0)

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
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      department: emp.departments?.name || '—',
      total_duty: totalDuty,
      salary_fixed: fixedSalaryRate,
      calculated_salary: calculatedSalary,
      advance_paid: advancePaid,
      final_payable: finalPayable
    }
  })

  return { data: wagesReport, error: null }
}

export async function getReportLeaves(startDate, endDate, deptId) {
  let query = supabase
    .from('leave_records')
    .select(`
      id,
      start_date,
      end_date,
      total_days,
      reason,
      employees!inner (
        full_name,
        employee_code,
        department_id,
        departments (name)
      ),
      leave_types (name)
    `)
    .gte('start_date', startDate)
    .lte('end_date', endDate)

  if (deptId) {
    query = query.eq('employees.department_id', deptId)
  }

  const { data, error } = await query
  if (error) return { data: null, error }

  const filtered = (data || []).filter(item => item.employees)
  return { data: filtered, error: null }
}

export async function getReportDutySummary(dsSelectedIds, dsStartDate, dsEndDate, dsAllEmps) {
  const { data: attData, error: attErr } = await supabase
    .from('attendance')
    .select('employee_id, status, shifts!shift_id(shift_value)')
    .gte('attendance_date', dsStartDate)
    .lte('attendance_date', dsEndDate)
    .in('employee_id', dsSelectedIds)

  if (attErr) return { data: null, error: attErr }

  const { data: advData, error: advErr } = await supabase
    .from('employee_salary_components')
    .select(`
      id,
      amount,
      salary_component_types (name),
      employee_salary_structures!inner (
        employee_id
      ),
      advance_settlements (settled_amount)
    `)

  if (advErr) return { data: null, error: advErr }

  const outstandingMap = {}
  ;(advData || []).forEach(comp => {
    if (!comp.salary_component_types?.name?.toLowerCase().includes('advance')) return
    const empId = comp.employee_salary_structures?.employee_id
    if (!empId) return

    const total = Number(comp.amount || 0)
    const settled = (comp.advance_settlements || []).reduce(
      (s, a) => s + Number(a.settled_amount || 0), 0
    )
    const outstanding = total - settled
    if (outstanding > 0) {
      outstandingMap[empId] = (outstandingMap[empId] || 0) + outstanding
    }
  })

  const dutyMap = {}
  ;(attData || []).forEach(att => {
    if (att.status === 'present') {
      const empId = att.employee_id
      dutyMap[empId] = (dutyMap[empId] || 0) + Number(att.shifts?.shift_value ?? 1.0)
    }
  })

  const report = dsAllEmps
    .filter(e => dsSelectedIds.includes(e.id))
    .map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      total_duty: dutyMap[emp.id] || 0,
      advance_outstanding: outstandingMap[emp.id] || 0
    }))

  return { data: report, error: null }
}
