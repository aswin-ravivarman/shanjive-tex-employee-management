/**
 * useAuth.js
 * ----------
 * Convenience hook for consuming AuthContext.
 *
 * Throws a descriptive error if used outside of <AuthProvider>,
 * which catches missing-provider bugs at development time.
 *
 * @example
 * const { user, appUser, loading, signIn, signOut } = useAuth()
 */

import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error(
      'useAuth() must be used inside an <AuthProvider>.\n' +
      'Make sure <AuthProvider> wraps your component tree in App.jsx.'
    )
  }

  return context
}
