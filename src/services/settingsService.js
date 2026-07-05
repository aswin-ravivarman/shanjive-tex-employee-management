import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

export async function getCompanySettings() {
  return supabase.from('company_settings').select('*').maybeSingle()
}

export async function saveCompanySettings(payload) {
  return supabase.from('company_settings').upsert(payload)
}

export async function getShifts() {
  return supabase.from('shifts').select('*').eq('is_active', true).order('name', { ascending: true })
}

export async function saveShift(id, payload) {
  if (id) {
    return supabase.from('shifts').update(payload).eq('id', id)
  }
  return supabase.from('shifts').insert([payload])
}

export async function deleteShift(id) {
  return supabase.from('shifts').update({ is_active: false }).eq('id', id)
}

export async function getHolidays() {
  return supabase.from('holidays').select('*').is('deleted_at', null).order('holiday_date', { ascending: true })
}

export async function saveHoliday(id, payload) {
  if (id) {
    return supabase.from('holidays').update(payload).eq('id', id)
  }
  return supabase.from('holidays').insert([payload])
}

export async function deleteHoliday(id) {
  return supabase.from('holidays').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export async function getDepartments() {
  return supabase.from('departments').select('*').is('deleted_at', null).order('name', { ascending: true })
}

export async function saveDepartment(id, payload) {
  if (id) {
    return supabase.from('departments').update(payload).eq('id', id)
  }
  return supabase.from('departments').insert([payload])
}

export async function deleteDepartment(id) {
  return supabase.from('departments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
}

export async function getAdmins() {
  return supabase.from('app_users').select('*').eq('role', 'admin').is('deleted_at', null).order('full_name', { ascending: true })
}

export async function getEmployeesForAdmin() {
  return supabase.from('employees').select('id, full_name, email').is('deleted_at', null).eq('status', 'active').order('full_name', { ascending: true })
}

export async function createAdmin(fullName, email, phone, password) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const secondaryClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  })

  const { data: signUpData, error: signUpErr } = await secondaryClient.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin'
      }
    }
  })

  if (signUpErr) throw signUpErr

  const authUserId = signUpData?.user?.id
  if (!authUserId) {
    throw new Error('Failed to register user in Supabase authentication system.')
  }

  // Check if trigger automatically populated app_users
  await new Promise(r => setTimeout(r, 1000))
  const { data: existingUser, error: checkErr } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (checkErr) console.warn('[settingsService] Error checking existing app_user:', checkErr.message)

  if (!existingUser) {
    const { error: insertErr } = await supabase
      .from('app_users')
      .insert([{
        auth_user_id: authUserId,
        full_name: fullName,
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        role: 'admin',
        is_active: true
      }])

    if (insertErr) throw insertErr
  }
  return { authUserId }
}

export async function convertEmployeeToAdmin(employeeId, fullName, email, password) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const secondaryClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  })

  const { data: signUpData, error: signUpErr } = await secondaryClient.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin'
      }
    }
  })

  if (signUpErr) throw signUpErr

  const authUserId = signUpData?.user?.id
  if (!authUserId) {
    throw new Error('Failed to register user in Supabase.')
  }

  await new Promise(r => setTimeout(r, 1000))
  const { data: existingUser, error: checkErr } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (checkErr) console.warn('[settingsService] Error checking app_user:', checkErr.message)

  let appUserId = existingUser?.id

  if (!existingUser) {
    const { data: insertData, error: insertErr } = await supabase
      .from('app_users')
      .insert([{
        auth_user_id: authUserId,
        full_name: fullName,
        email: email.trim(),
        role: 'admin',
        is_active: true
      }])
      .select()
      .single()

    if (insertErr) throw insertErr
    appUserId = insertData.id
  }

  // Soft delete the employee profile so they don't appear in attendance etc.
  const { error: empUpdateErr } = await supabase
    .from('employees')
    .update({ 
      status: 'inactive', 
      deleted_at: new Date().toISOString() 
    })
    .eq('id', employeeId)

  if (empUpdateErr) throw empUpdateErr
  return { appUserId }
}

export async function deactivateAdmin(userId, isActive) {
  return supabase
    .from('app_users')
    .update({ is_active: isActive })
    .eq('id', userId)
}
