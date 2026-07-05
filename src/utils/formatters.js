/**
 * formatters.js
 * -------------
 * All display-formatting utilities for the HRMS application.
 *
 * Rules:
 *  - ALWAYS use dayjs for date/time — never new Date().toLocaleDateString().
 *  - Functions must be pure (no side effects, no imports from services).
 *  - Each function returns a string or a safe fallback ('—') when input is nullish.
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import customParseFormat from 'dayjs/plugin/customParseFormat'

import {
  DATE_FORMATS,
  CURRENCY,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from './constants'

// Register Day.js plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(customParseFormat)

// Fallback value for null/undefined/empty data in display
const EMPTY = '—'

// ─────────────────────────────────────────────────────────────
// DATE & TIME
// ─────────────────────────────────────────────────────────────

/**
 * Format a date value for display.
 * @param {string|Date|null} date — ISO date string or Date object
 * @param {string} format — Day.js format string (defaults to 'DD MMM YYYY')
 * @returns {string}
 */
export function formatDate(date, format = DATE_FORMATS.DISPLAY) {
  if (!date) return EMPTY
  const d = dayjs(date)
  return d.isValid() ? d.format(format) : EMPTY
}

/**
 * Format a timestamptz from Supabase (UTC) for local display.
 * @param {string|null} timestamp — ISO datetime string (UTC)
 * @param {string} format
 * @returns {string}
 */
export function formatDateTime(timestamp, format = DATE_FORMATS.DATETIME) {
  if (!timestamp) return EMPTY
  const d = dayjs(timestamp)
  return d.isValid() ? d.format(format) : EMPTY
}

/**
 * Format a time value (HH:mm or timestamptz) for display.
 * @param {string|null} time — time string or full ISO datetime
 * @param {boolean} use24h — use 24-hour format (default: false → 12h AM/PM)
 * @returns {string}
 */
export function formatTime(time, use24h = false) {
  if (!time) return EMPTY
  const fmt = use24h ? DATE_FORMATS.TIME_24H : DATE_FORMATS.TIME_12H
  // Handle both 'HH:mm:ss' time strings and full ISO timestamps
  const d = time.includes('T') ? dayjs(time) : dayjs(`2000-01-01T${time}`)
  return d.isValid() ? d.format(fmt) : EMPTY
}

/**
 * Human-readable relative time (e.g. "2 hours ago", "in 3 days").
 * @param {string|Date|null} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  if (!date) return EMPTY
  const d = dayjs(date)
  return d.isValid() ? d.fromNow() : EMPTY
}

/**
 * Format month + year for payroll headers.
 * @param {number} month — 1-based month number
 * @param {number} year
 * @returns {string} e.g. "January 2025"
 */
export function formatMonthYear(month, year) {
  if (!month || !year) return EMPTY
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format(DATE_FORMATS.MONTH_YEAR)
}

/**
 * Format decimal hours as "Xh Ym" (e.g. 8.5 → "8h 30m").
 * Used for displaying working_hours from attendance records.
 * @param {number|null} hours
 * @returns {string}
 */
export function formatWorkingHours(hours) {
  if (hours == null || isNaN(hours)) return EMPTY
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Return today's date as an ISO string (YYYY-MM-DD) for Supabase queries.
 * @returns {string}
 */
export function todayISO() {
  return dayjs().format(DATE_FORMATS.ISO)
}

/**
 * Return current year as a number.
 * @returns {number}
 */
export function currentYear() {
  return dayjs().year()
}

// ─────────────────────────────────────────────────────────────
// CURRENCY & NUMBERS
// ─────────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees.
 * @param {number|string|null} amount
 * @param {boolean} showSymbol — prefix with ₹ (default: true)
 * @returns {string} e.g. "₹1,23,456.00"
 */
export function formatCurrency(amount, showSymbol = true) {
  if (amount == null || amount === '') return EMPTY
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return EMPTY
  const formatted = new Intl.NumberFormat(CURRENCY.LOCALE, {
    style:                 showSymbol ? 'currency' : 'decimal',
    currency:              CURRENCY.CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
  return formatted
}

/**
 * Format a number with Indian-style comma grouping (no currency symbol).
 * @param {number|null} num
 * @returns {string} e.g. "1,23,456"
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return EMPTY
  return new Intl.NumberFormat(CURRENCY.LOCALE).format(num)
}

// ─────────────────────────────────────────────────────────────
// PHONE / ID MASKING
// ─────────────────────────────────────────────────────────────

/**
 * Format a 10-digit Indian mobile number as "+91 XXXXX XXXXX".
 * @param {string|null} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return EMPTY
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone // return as-is if not 10 digits
}

/**
 * Mask an Aadhaar number for display (show only last 4 digits).
 * @param {string|null} aadhaar
 * @returns {string} e.g. "XXXX XXXX 3456"
 */
export function maskAadhaar(aadhaar) {
  if (!aadhaar) return EMPTY
  const digits = aadhaar.replace(/\D/g, '')
  if (digits.length !== 12) return EMPTY
  return `XXXX XXXX ${digits.slice(8)}`
}

/**
 * Mask a bank account number (show only last 4 digits).
 * @param {string|null} account
 * @returns {string}
 */
export function maskBankAccount(account) {
  if (!account) return EMPTY
  if (account.length <= 4) return account
  return `${'X'.repeat(account.length - 4)}${account.slice(-4)}`
}

// ─────────────────────────────────────────────────────────────
// NAME / TEXT
// ─────────────────────────────────────────────────────────────

/**
 * Mask a PAN Card number (show only last 4 characters).
 * @param {string|null} pan
 * @returns {string}
 */
export function maskPan(pan) {
  if (!pan) return EMPTY
  const clean = pan.trim()
  if (clean.length < 4) return clean
  return `${'X'.repeat(clean.length - 4)}${clean.slice(-4)}`
}

/**
 * Generic Enum Formatter (replaces underscores with spaces, capitalizes words).
 * @param {string|null} val
 * @returns {string}
 */
export function formatEnum(val) {
  if (!val) return EMPTY
  return val
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}


/**
 * Get initials from a full name (max 2 characters).
 * "Priya Rajan" → "PR" | "Arjun" → "A"
 * @param {string|null} fullName
 * @returns {string}
 */
export function getInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '?'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Capitalize the first letter of each word.
 * @param {string|null} str
 * @returns {string}
 */
export function titleCase(str) {
  if (!str) return EMPTY
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Truncate a string to maxLength characters, adding '…' if truncated.
 * @param {string|null} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str) return EMPTY
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '…'
}

// ─────────────────────────────────────────────────────────────
// ENUM LABEL LOOKUPS
// ─────────────────────────────────────────────────────────────

/**
 * Get human-readable label for an employment type value.
 * @param {string|null} type
 * @returns {string}
 */
export function formatEmploymentType(type) {
  if (!type) return EMPTY
  return EMPLOYMENT_TYPE_LABELS[type] ?? titleCase(type.replace(/_/g, ' '))
}

/**
 * Get human-readable label for an employee status value.
 * @param {string|null} status
 * @returns {string}
 */
export function formatEmployeeStatus(status) {
  if (!status) return EMPTY
  return EMPLOYEE_STATUS_LABELS[status] ?? titleCase(status.replace(/_/g, ' '))
}

/**
 * Get human-readable label for an attendance status value.
 * @param {string|null} status
 * @returns {string}
 */
export function formatAttendanceStatus(status) {
  if (!status) return EMPTY
  return ATTENDANCE_STATUS_LABELS[status] ?? titleCase(status.replace(/_/g, ' '))
}

/**
 * Get human-readable label for a payroll run status value.
 * @param {string|null} status
 * @returns {string}
 */
export function formatPayrollStatus(status) {
  if (!status) return EMPTY
  return PAYROLL_STATUS_LABELS[status] ?? titleCase(status.replace(/_/g, ' '))
}

// ─────────────────────────────────────────────────────────────
// FILE SIZE
// ─────────────────────────────────────────────────────────────

/**
 * Format bytes into a human-readable file size.
 * @param {number} bytes
 * @returns {string} e.g. "2.4 MB"
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
