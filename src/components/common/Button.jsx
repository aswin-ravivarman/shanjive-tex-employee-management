/**
 * Button.jsx
 * ----------
 * Reusable Button component matching the Shanjive Tex design system.
 *
 * Props:
 * @param {string} variant - 'primary', 'secondary', 'outline', 'danger', 'text' (default: 'primary')
 * @param {string} size - 'sm', 'md', 'lg' (default: 'md')
 * @param {boolean} loading - Shows a spinner and disables input
 * @param {boolean} disabled - Native HTML disabled state
 * @param {React.ReactNode} icon - Optional icon prepended to label
 * @param {React.ReactNode} iconRight - Optional icon appended to label
 * @param {string} type - 'button', 'submit', 'reset' (default: 'button')
 */

import './Button.css'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconRight = null,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        loading ? 'btn--loading' : '',
        className
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true" />
      )}
      
      {!loading && icon && (
        <span className="btn-icon btn-icon--left" aria-hidden="true">{icon}</span>
      )}
      
      <span className="btn-label">{children}</span>
      
      {!loading && iconRight && (
        <span className="btn-icon btn-icon--right" aria-hidden="true">{iconRight}</span>
      )}
    </button>
  )
}
