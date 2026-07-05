/**
 * Badge.jsx
 * ---------
 * Themed status badge pill component.
 * Maps status keys to specific custom HSL theme styles automatically.
 *
 * Props:
 * @param {string} status - Key value (e.g. 'present', 'absent', 'active', 'inactive', 'draft', 'paid', 'week_off')
 * @param {string} label - Text shown inside badge (falls back to capitalizing the status key)
 */

import { formatEnum } from '@/utils/formatters'
import './Badge.css'

// Map values to Tailwind-alternative standard CSS variant classes
const VARIANT_MAP = {
  // Attendance
  present:    'badge--success',
  absent:     'badge--danger',
  half_day:   'badge--warning',
  leave:      'badge--info',
  holiday:    'badge--neutral',
  week_off:   'badge--neutral',
  
  // Statuses
  active:     'badge--success',
  inactive:   'badge--danger',
  terminated: 'badge--danger',
  resigned:   'badge--warning',
  on_leave:   'badge--info',

  // Payroll
  draft:      'badge--neutral',
  processed:  'badge--info',
  locked:     'badge--warning',
  paid:       'badge--success',
}

export default function Badge({ status, label }) {
  const normalized = status?.toLowerCase() || ''
  const variantClass = VARIANT_MAP[normalized] || 'badge--neutral'
  const displayLabel = label || formatEnum(status)

  return (
    <span className={`badge ${variantClass}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span className="badge-text">{displayLabel}</span>
    </span>
  )
}
