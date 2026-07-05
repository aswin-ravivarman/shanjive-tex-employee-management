/**
 * Login.jsx
 * ---------
 * Login page for Shanjive Tex HRMS.
 * No self-registration flow — accounts are created by Super Admin only.
 * After login, redirects to /dashboard (role-based access is enforced by RoleRoute).
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RiMailLine, RiLockPasswordLine, RiEyeLine, RiEyeOffLine, RiLoginBoxLine } from 'react-icons/ri'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail, validateRequired } from '@/utils/validators'
import logoImage from '@/assets/sanjiv tex logo .png'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  // Redirect to the page the user was trying to visit, or /dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  // Form state
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors]     = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear field-level error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setServerError('')
  }

  function validate() {
    const newErrors = {}
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError
    const passwordError = validateRequired(formData.password, 'Password')
    if (passwordError) newErrors.password = passwordError
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError('')

    const { error } = await signIn(formData.email.trim(), formData.password)

    setLoading(false)

    if (error) {
      // Map Supabase error codes to user-friendly messages
      const message = error.message?.toLowerCase() || ''
      if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
        setServerError('Incorrect email or password. Please try again.')
      } else if (message.includes('email not confirmed')) {
        setServerError('Please confirm your email address before signing in.')
      } else if (message.includes('too many requests')) {
        setServerError('Too many login attempts. Please wait a moment and try again.')
      } else {
        setServerError(error.message || 'Sign in failed. Please try again.')
      }
      return
    }

    navigate(from, { replace: true })
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="login-card">
      {/* Header */}
      <div className="login-header">
        <img src={logoImage} alt="Shanjive Tex Logo" className="login-logo" />
        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your account to continue</p>
      </div>

      {/* Server-level error banner */}
      {serverError && (
        <div className="login-error-banner" role="alert">
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form className="login-form" onSubmit={handleSubmit} noValidate>

        {/* Email */}
        <div className="login-field">
          <label className="login-label" htmlFor="login-email">
            Email address
          </label>
          <div className={`login-input-wrapper ${errors.email ? 'has-error' : ''}`}>
            <RiMailLine className="login-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@shanjive.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="login-input"
            />
          </div>
          {errors.email && (
            <span id="email-error" className="login-field-error" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        {/* Password */}
        <div className="login-field">
          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <div className={`login-input-wrapper ${errors.password ? 'has-error' : ''}`}>
            <RiLockPasswordLine className="login-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="login-input"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword
                ? <RiEyeOffLine aria-hidden="true" />
                : <RiEyeLine aria-hidden="true" />
              }
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className="login-field-error" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          type="submit"
          className="login-submit-btn"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="login-spinner" aria-hidden="true"></span>
              Signing in…
            </>
          ) : (
            <>
              <RiLoginBoxLine aria-hidden="true" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Footer note */}
      <p className="login-footer-note">
        Don't have an account? Contact your administrator.
      </p>
    </div>
  )
}
