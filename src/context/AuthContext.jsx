/**
 * AuthContext.jsx
 * ---------------
 * Global authentication state for the application.
 *
 * Responsibilities:
 *  1. Resolve the Supabase session on app mount (handles page refresh).
 *  2. Fetch the corresponding app_users row (role, name, is_active, etc.).
 *  3. Sign out and show an error if the user is inactive or has no app_users row.
 *  4. Subscribe to Supabase auth state changes (token refresh, sign-out from another tab).
 *  5. Expose { user, appUser, loading, signIn, signOut } to the component tree.
 *
 * ARCHITECTURE RULE: This is one of only TWO files allowed to import supabaseClient.
 * The other is services/authService.js. No component should import supabase directly.
 */

import { createContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabaseClient'
import {
  signIn as authSignIn,
  signOut as authSignOut,
  getCurrentAppUser,
} from '@/services/authService'

export const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  // Supabase auth user object (from auth.users)
  const [user, setUser] = useState(null)
  // Our app_users row (role, full_name, is_active, etc.)
  const [appUser, setAppUser] = useState(null)
  // True while resolving the initial session (prevents flash of login page)
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // RESOLVE APP USER
  // Retries up to 4 times (2.4s total) to handle the RLS race condition:
  // Supabase's JWT may not be visible to RLS policies immediately after
  // signInWithPassword returns. The retry loop gives it time to propagate.
  // ─────────────────────────────────────────────────────────────
  const resolveAppUser = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null)
      setAppUser(null)
      return
    }

    let fetchedAppUser = null
    let lastError = null

    for (let attempt = 1; attempt <= 4; attempt++) {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
      const { appUser: result, error } = await getCurrentAppUser(authUser.id)
      if (result) {
        fetchedAppUser = result
        lastError = null
        break
      }
      lastError = error
      console.warn(`[AuthContext] app_users fetch attempt ${attempt} failed:`, error?.message)
    }

    if (!fetchedAppUser) {
      console.error('[AuthContext] No app_users row found after retries for:', authUser.id, lastError)
      await authSignOut()
      setUser(null)
      setAppUser(null)
      toast.error('Your account is not set up correctly. Please contact your administrator.')
      return
    }

    if (!fetchedAppUser.is_active) {
      // Account exists but has been deactivated.
      await authSignOut()
      setUser(null)
      setAppUser(null)
      toast.error('Your account has been deactivated. Please contact your administrator.')
      return
    }

    setUser(authUser)
    setAppUser(fetchedAppUser)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // INITIAL SESSION RESOLUTION (on mount)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          await resolveAppUser(session?.user ?? null)
        }
      } catch (err) {
        console.error('[AuthContext] Error resolving initial session:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initSession()

    return () => { isMounted = false }
  }, [resolveAppUser])

  // ─────────────────────────────────────────────────────────────
  // AUTH STATE CHANGE SUBSCRIPTION
  // Handles: token refresh, sign-out from another tab, session expiry
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // SIGNED_IN fires on initial load too — we already handle that above,
        // so only react to changes after the initial load is complete.
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setAppUser(null)
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            // Re-fetch app_users in case role/status changed server-side
            await resolveAppUser(session.user)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [resolveAppUser])

  // ─────────────────────────────────────────────────────────────
  // SIGN IN
  // ─────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await authSignIn(email, password)

    if (error) {
      return { error }
    }

    const authUser = data?.user
    if (!authUser) {
      return { error: new Error('Authentication failed. Please try again.') }
    }

    // resolveAppUser includes retry loop for RLS timing
    await resolveAppUser(authUser)

    return { error: null }
  }, [resolveAppUser])

  // ─────────────────────────────────────────────────────────────
  // SIGN OUT
  // ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    const { error } = await authSignOut()
    if (error) {
      console.error('[AuthContext] Sign out error:', error)
      toast.error('Sign out failed. Please try again.')
      return
    }
    setUser(null)
    setAppUser(null)
  }, [])

  // ─────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────
  const value = {
    user,      // Supabase auth user object (auth.users row)
    appUser,   // app_users row: { id, role, full_name, email, is_active, must_reset_password, ... }
    loading,   // true while session is being resolved on mount
    signIn,    // (email, password) => Promise<{ error }>
    signOut,   // () => Promise<void>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
