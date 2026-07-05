import { supabase } from '@/lib/supabaseClient'

export async function getAdvances() {
  const { data, error } = await supabase
    .from('employee_salary_components')
    .select(`
      id,
      amount,
      created_at,
      salary_component_types (id, name, kind),
      employee_salary_structures!salary_structure_id (
        employee_id,
        employees (
          full_name,
          employee_code
        )
      ),
      advance_settlements (
        id,
        settled_amount,
        settlement_date,
        remarks,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error }

  const mapped = (data || [])
    .filter(item =>
      item.salary_component_types?.name?.toLowerCase().includes('advance') &&
      item.employee_salary_structures?.employees
    )
    .map(item => {
      const totalSettled = (item.advance_settlements || []).reduce(
        (sum, s) => sum + Number(s.settled_amount || 0), 0
      )
      const outstanding = Math.max(0, Number(item.amount) - totalSettled)
      return {
        id: item.id,
        amount: Number(item.amount),
        created_at: item.created_at,
        employees: item.employee_salary_structures.employees,
        total_settled: totalSettled,
        outstanding,
        settlements: (item.advance_settlements || []).sort(
          (a, b) => new Date(b.settlement_date) - new Date(a.settlement_date)
        )
      }
    })

  return { data: mapped, error: null }
}

export async function recordAdvance(employeeId, amount) {
  try {
    // 1. Get or auto-create the 'Advance' salary component type
    let compTypeId = null
    const { data: existing } = await supabase
      .from('salary_component_types')
      .select('id')
      .ilike('name', 'advance')
      .maybeSingle()

    if (existing) {
      compTypeId = existing.id
    } else {
      const { data: created, error: createErr } = await supabase
        .from('salary_component_types')
        .insert([{ name: 'Advance', kind: 'deduction' }])
        .select('id')
        .single()
      if (createErr) throw new Error('Could not create Advance component type: ' + createErr.message)
      compTypeId = created.id
    }

    // 2. Fetch or create employee salary structure
    let { data: struct } = await supabase
      .from('employee_salary_structures')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('is_current', true)
      .maybeSingle()

    if (!struct) {
      const { data: newStruct } = await supabase
        .from('employee_salary_structures')
        .insert([{
          employee_id: employeeId,
          basic_salary: 450.00,
          effective_from: new Date().toISOString().split('T')[0],
          is_current: true
        }])
        .select()
        .single()
      struct = newStruct
    }

    // 3. Insert advance component
    const { error: insertErr } = await supabase
      .from('employee_salary_components')
      .insert([{
        salary_structure_id: struct.id,
        component_type_id: compTypeId,
        amount: Number(amount)
      }])

    if (insertErr) throw new Error('DB insert failed: ' + insertErr.message)

    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function settleAdvance(advanceComponentId, settledAmount, remarks) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', session?.user?.id)
      .maybeSingle()

    const { error } = await supabase
      .from('advance_settlements')
      .insert([{
        advance_component_id: advanceComponentId,
        settled_amount: Number(settledAmount),
        settlement_date: new Date().toISOString().split('T')[0],
        remarks: remarks || null,
        created_by: appUser?.id || null
      }])

    if (error) return { error }
    return { error: null }
  } catch (error) {
    return { error }
  }
}
