/**
 * Input.jsx
 * ---------
 * Reusable Form Input component matching the Shanjive Tex design system.
 * Renders standard text fields, textareas, or select dropdowns dynamically.
 *
 * Props:
 * @param {string} label - Input label text
 * @param {string} type - HTML input type: 'text', 'number', 'email', 'date', 'select', 'textarea', etc.
 * @param {string} error - Display validation error string and red rings
 * @param {string} helperText - Text shown below field for auxiliary info
 * @param {Array<{value, label}>} options - Dropdown items (only when type='select')
 * @param {React.ReactNode} icon - Optional icon prefix inside the field
 */

import { forwardRef } from 'react'
import './Input.css'

const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error = '',
  helperText = '',
  options = [],
  icon = null,
  className = '',
  required = false,
  ...props
}, ref) => {
  const isSelect = type === 'select'
  const isTextarea = type === 'textarea'
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && <span className="form-label-required" aria-hidden="true"> *</span>}
        </label>
      )}

      <div className="form-input-wrapper">
        {icon && !isTextarea && (
          <span className="form-input-icon" aria-hidden="true">{icon}</span>
        )}

        {isSelect ? (
          <select
            id={inputId}
            ref={ref}
            required={required}
            className={`form-input form-select ${icon ? 'form-input--has-icon' : ''}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            id={inputId}
            ref={ref}
            required={required}
            className="form-input form-textarea"
            {...props}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            ref={ref}
            required={required}
            className={`form-input ${icon ? 'form-input--has-icon' : ''}`}
            {...props}
          />
        )}
      </div>

      {error ? (
        <span className="form-error-msg" role="alert" id={`${inputId}-error`}>
          {error}
        </span>
      ) : helperText ? (
        <span className="form-helper-text" id={`${inputId}-helper`}>
          {helperText}
        </span>
      ) : null}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
