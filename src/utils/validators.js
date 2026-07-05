/**
 * validators.js
 * -------------
 * Client-side form validation utilities.
 *
 * Philosophy:
 *  - These functions are for UX feedback only. The database constraints
 *    and RLS policies are the authoritative enforcement layer.
 *  - Each validator returns null on success, or a string error message on failure.
 *  - This makes them composable with form state:
 *      const error = validateEmail(value)
 *      if (error) setErrors(prev => ({ ...prev, email: error }))
 *  - validateForm() accepts a field → validator map and runs all checks at once.
 */

// ─────────────────────────────────────────────────────────────
// PRIMITIVE VALIDATORS
// Return null (valid) or error string (invalid).
// ─────────────────────────────────────────────────────────────

/**
 * Validate that a field is not empty.
 * @param {string|null|undefined} value
 * @param {string} fieldName — used in the error message
 * @returns {string|null}
 */
export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined) return `${fieldName} is required`
  if (typeof value === 'string' && value.trim() === '') return `${fieldName} is required`
  return null
}

/**
 * Validate an email address.
 * @param {string|null} email
 * @returns {string|null}
 */
export function validateEmail(email) {
  if (!email || email.trim() === '') return 'Email is required'
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!pattern.test(email.trim())) return 'Enter a valid email address'
  return null
}

/**
 * Validate an Indian mobile number (10 digits, starting with 6–9).
 * @param {string|null} phone
 * @param {boolean} required — if false, empty value is accepted
 * @returns {string|null}
 */
export function validatePhone(phone, required = true) {
  if (!phone || phone.trim() === '') {
    return required ? 'Mobile number is required' : null
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits'
  if (!/^[6-9]/.test(digits)) return 'Mobile number must start with 6, 7, 8, or 9'
  return null
}

/**
 * Validate an Aadhaar number (exactly 12 digits).
 * @param {string|null} aadhaar
 * @param {boolean} required
 * @returns {string|null}
 */
export function validateAadhaar(aadhaar, required = false) {
  if (!aadhaar || aadhaar.trim() === '') {
    return required ? 'Aadhaar number is required' : null
  }
  const digits = aadhaar.replace(/\D/g, '')
  if (digits.length !== 12) return 'Aadhaar number must be exactly 12 digits'
  // Aadhaar cannot start with 0 or 1
  if (/^[01]/.test(digits)) return 'Aadhaar number is invalid'
  return null
}

/**
 * Validate an Indian PAN number (format: ABCDE1234F).
 * @param {string|null} pan
 * @param {boolean} required
 * @returns {string|null}
 */
export function validatePAN(pan, required = false) {
  if (!pan || pan.trim() === '') {
    return required ? 'PAN number is required' : null
  }
  const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  if (!pattern.test(pan.trim().toUpperCase())) {
    return 'PAN must be in the format ABCDE1234F (5 letters, 4 digits, 1 letter)'
  }
  return null
}

/**
 * Validate an IFSC code (format: 4 letters + 0 + 6 alphanumeric).
 * @param {string|null} ifsc
 * @param {boolean} required
 * @returns {string|null}
 */
export function validateIFSC(ifsc, required = false) {
  if (!ifsc || ifsc.trim() === '') {
    return required ? 'IFSC code is required' : null
  }
  const pattern = /^[A-Z]{4}0[A-Z0-9]{6}$/
  if (!pattern.test(ifsc.trim().toUpperCase())) {
    return 'IFSC must be in the format ABCD0123456 (4 letters, 0, 6 alphanumeric)'
  }
  return null
}

/**
 * Validate a bank account number (8–18 digits).
 * @param {string|null} account
 * @param {boolean} required
 * @returns {string|null}
 */
export function validateBankAccount(account, required = false) {
  if (!account || account.trim() === '') {
    return required ? 'Bank account number is required' : null
  }
  const digits = account.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 18) {
    return 'Bank account number must be 8–18 digits'
  }
  return null
}

/**
 * Validate a date string is a valid calendar date.
 * @param {string|null} date — expected format: YYYY-MM-DD
 * @param {string} fieldName
 * @returns {string|null}
 */
export function validateDate(date, fieldName = 'Date') {
  if (!date || date.trim() === '') return `${fieldName} is required`
  // Basic ISO date format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${fieldName} must be a valid date (YYYY-MM-DD)`
  const d = new Date(date)
  if (isNaN(d.getTime())) return `${fieldName} is not a valid date`
  return null
}

/**
 * Validate that a date is not in the future.
 * @param {string|null} date — YYYY-MM-DD
 * @param {string} fieldName
 * @returns {string|null}
 */
export function validateNotFuture(date, fieldName = 'Date') {
  const baseError = validateDate(date, fieldName)
  if (baseError) return baseError
  if (new Date(date) > new Date()) return `${fieldName} cannot be in the future`
  return null
}

/**
 * Validate that end date is not before start date.
 * @param {string|null} startDate — YYYY-MM-DD
 * @param {string|null} endDate — YYYY-MM-DD
 * @returns {string|null}
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return null // individual field validators handle required
  if (new Date(endDate) < new Date(startDate)) {
    return 'End date cannot be before start date'
  }
  return null
}

/**
 * Validate a number is positive and greater than zero.
 * @param {number|string|null} value
 * @param {string} fieldName
 * @returns {string|null}
 */
export function validatePositiveNumber(value, fieldName = 'Value') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`
  }
  const num = Number(value)
  if (isNaN(num)) return `${fieldName} must be a number`
  if (num <= 0) return `${fieldName} must be greater than zero`
  return null
}

/**
 * Validate minimum string length.
 * @param {string|null} value
 * @param {number} min
 * @param {string} fieldName
 * @returns {string|null}
 */
export function validateMinLength(value, min, fieldName = 'Field') {
  if (!value || value.trim().length < min) {
    return `${fieldName} must be at least ${min} characters`
  }
  return null
}

/**
 * Validate maximum string length.
 * @param {string|null} value
 * @param {number} max
 * @param {string} fieldName
 * @returns {string|null}
 */
export function validateMaxLength(value, max, fieldName = 'Field') {
  if (value && value.trim().length > max) {
    return `${fieldName} must be at most ${max} characters`
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// COMPOSITE VALIDATOR
// ─────────────────────────────────────────────────────────────

/**
 * Run multiple validators against a form's field values.
 *
 * @param {Record<string, any>} values — form field values
 * @param {Record<string, (value: any) => string|null>} rules — field → validator fn
 * @returns {{ errors: Record<string, string>, isValid: boolean }}
 *
 * @example
 * const { errors, isValid } = validateForm(
 *   { email: formData.email, phone: formData.phone },
 *   {
 *     email: (v) => validateEmail(v),
 *     phone: (v) => validatePhone(v),
 *   }
 * )
 */
export function validateForm(values, rules) {
  const errors = {}
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(values[field])
    if (error) errors[field] = error
  }
  return { errors, isValid: Object.keys(errors).length === 0 }
}

// ─────────────────────────────────────────────────────────────
// FILE VALIDATORS
// ─────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Validate an employee photo file before upload.
 * @param {File|null} file
 * @returns {string|null}
 */
export function validatePhotoFile(file) {
  if (!file) return null // optional field
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Photo must be a JPEG, PNG, or WebP image'
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return 'Photo must be smaller than 2 MB'
  }
  return null
}
