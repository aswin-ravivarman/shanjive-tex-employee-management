/**
 * constants.js
 * ------------
 * Application-wide enumerations and configuration constants.
 *
 * These must match the PostgreSQL enum values in the database schema exactly.
 * If a DB enum changes, update here too and search for all usages.
 *
 * Rule: Never use raw string literals like 'super_admin' or 'present'
 * in component or service code — always import from this file.
 */

// ─────────────────────────────────────────────────────────────
// ROLES  (matches app_role enum in schema)
// ─────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN:       'admin',
  EMPLOYEE:    'employee',
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEE STATUS  (matches employee_status enum in schema)
// ─────────────────────────────────────────────────────────────
export const EMPLOYEE_STATUS = {
  ACTIVE:     'active',
  INACTIVE:   'inactive',
  ON_LEAVE:   'on_leave',
  TERMINATED: 'terminated',
}

export const EMPLOYEE_STATUS_LABELS = {
  [EMPLOYEE_STATUS.ACTIVE]:     'Active',
  [EMPLOYEE_STATUS.INACTIVE]:   'Inactive',
  [EMPLOYEE_STATUS.ON_LEAVE]:   'On Leave',
  [EMPLOYEE_STATUS.TERMINATED]: 'Terminated',
}

export const EMPLOYEE_STATUS_OPTIONS = Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}))


// ─────────────────────────────────────────────────────────────
// EMPLOYMENT TYPE  (matches employment_type enum in schema)
// ─────────────────────────────────────────────────────────────
export const EMPLOYMENT_TYPE = {
  FULL_TIME:  'full_time',
  PART_TIME:  'part_time',
  CONTRACT:   'contract',
  INTERN:     'intern',
}

export const EMPLOYMENT_TYPE_LABELS = {
  [EMPLOYMENT_TYPE.FULL_TIME]: 'Full Time',
  [EMPLOYMENT_TYPE.PART_TIME]: 'Part Time',
  [EMPLOYMENT_TYPE.CONTRACT]:  'Contract',
  [EMPLOYMENT_TYPE.INTERN]:    'Intern',
}

export const EMPLOYMENT_TYPE_OPTIONS = Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label
}))


// ─────────────────────────────────────────────────────────────
// ATTENDANCE STATUS  (matches attendance_status enum in schema)
// ─────────────────────────────────────────────────────────────
export const ATTENDANCE_STATUS = {
  PRESENT:  'present',
  ABSENT:   'absent',
  HALF_DAY: 'half_day',
  LEAVE:    'leave',
  HOLIDAY:  'holiday',
  WEEK_OFF: 'week_off',
}

export const ATTENDANCE_STATUS_LABELS = {
  [ATTENDANCE_STATUS.PRESENT]:  'Present',
  [ATTENDANCE_STATUS.ABSENT]:   'Absent',
  [ATTENDANCE_STATUS.HALF_DAY]: 'Half Day',
  [ATTENDANCE_STATUS.LEAVE]:    'On Leave',
  [ATTENDANCE_STATUS.HOLIDAY]:  'Holiday',
  [ATTENDANCE_STATUS.WEEK_OFF]: 'Week Off',
}

// ─────────────────────────────────────────────────────────────
// PAYROLL RUN STATUS  (matches payroll_status enum in schema)
// ─────────────────────────────────────────────────────────────
export const PAYROLL_STATUS = {
  DRAFT:     'draft',
  PROCESSED: 'processed',
  LOCKED:    'locked',
  PAID:      'paid',
}

export const PAYROLL_STATUS_LABELS = {
  [PAYROLL_STATUS.DRAFT]:     'Draft',
  [PAYROLL_STATUS.PROCESSED]: 'Processed',
  [PAYROLL_STATUS.LOCKED]:    'Locked',
  [PAYROLL_STATUS.PAID]:      'Paid',
}

// Allowed next status from each state (lifecycle guard)
export const PAYROLL_STATUS_TRANSITIONS = {
  [PAYROLL_STATUS.DRAFT]:     [PAYROLL_STATUS.PROCESSED],
  [PAYROLL_STATUS.PROCESSED]: [PAYROLL_STATUS.LOCKED],
  [PAYROLL_STATUS.LOCKED]:    [PAYROLL_STATUS.PAID],
  [PAYROLL_STATUS.PAID]:      [], // terminal — no further transitions
}

// ─────────────────────────────────────────────────────────────
// SALARY COMPONENT KIND  (matches component_kind enum in schema)
// ─────────────────────────────────────────────────────────────
export const COMPONENT_KIND = {
  ALLOWANCE:  'allowance',
  DEDUCTION:  'deduction',
}


// ─────────────────────────────────────────────────────────────
// GENDER OPTIONS
// ─────────────────────────────────────────────────────────────
export const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
]

// ─────────────────────────────────────────────────────────────
// BLOOD GROUP OPTIONS
// ─────────────────────────────────────────────────────────────
export const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
].map(v => ({ value: v, label: v }))

// ─────────────────────────────────────────────────────────────
// MODULES  (must match permission module names in DB exactly)
// ─────────────────────────────────────────────────────────────
export const MODULES = {
  DASHBOARD:        'dashboard',
  EMPLOYEES:        'employees',
  ATTENDANCE:       'attendance',
  LEAVE:            'leave',
  REPORTS:          'reports',
  PAYROLL:          'payroll',
  SETTINGS:         'settings',
  ADMIN_MANAGEMENT: 'admin_management',
}

// ─────────────────────────────────────────────────────────────
// PERMISSIONS  (module.action format — must match DB seeds)
// ─────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  DASHBOARD_VIEW:          'dashboard.view',
  EMPLOYEES_VIEW:          'employees.view',
  EMPLOYEES_CREATE:        'employees.create',
  EMPLOYEES_EDIT:          'employees.edit',
  EMPLOYEES_DELETE:        'employees.delete',
  ATTENDANCE_VIEW:         'attendance.view',
  ATTENDANCE_MANAGE:       'attendance.manage',
  LEAVE_VIEW:              'leave.view',
  LEAVE_MANAGE:            'leave.manage',

  REPORTS_VIEW_GENERAL:    'reports.view_general',
  REPORTS_VIEW_PAYROLL:    'reports.view_payroll',
  PAYROLL_VIEW:            'payroll.view',
  PAYROLL_MANAGE:          'payroll.manage',
  ADVANCES_VIEW:           'advances.view',
  ADVANCES_MANAGE:         'advances.manage',
  WAGES_SUMMARY_VIEW:      'wages_summary.view',
  WAGES_SUMMARY_MANAGE:    'wages_summary.manage',
  SETTINGS_MANAGE:         'settings.manage',
  ADMIN_MANAGEMENT_MANAGE: 'admin_management.manage',
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION ITEMS
// Ordered list used by Sidebar.jsx to render menu items.
// Each item's `permission` is checked against hasPermission().
// ─────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  {
    id:         'dashboard',
    label:      'Dashboard',
    path:       '/dashboard',
    icon:       'RxDashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    id:         'employees',
    label:      'Employees',
    path:       '/employees',
    icon:       'RiTeamLine',
    permission: PERMISSIONS.EMPLOYEES_VIEW,
  },
  {
    id:         'attendance',
    label:      'Attendance',
    path:       '/attendance',
    icon:       'RiCalendarCheckLine',
    permission: PERMISSIONS.ATTENDANCE_VIEW,
  },
  {
    id:         'leave',
    label:      'Leave',
    path:       '/leave',
    icon:       'RiCalendarEventLine',
    permission: PERMISSIONS.LEAVE_VIEW,
  },
  {
    id:         'payroll',
    label:      'Payroll',
    path:       '/payroll',
    icon:       'RiMoneyDollarCircleLine',
    permission: PERMISSIONS.PAYROLL_VIEW,
  },
  {
    id:         'advances',
    label:      'Advances Paid',
    path:       '/advances',
    icon:       'RiCoinsLine',
    permission: PERMISSIONS.PAYROLL_VIEW,
  },
  {
    id:         'wages-summary',
    label:      'Wages Summary',
    path:       '/wages-summary',
    icon:       'RiFileList3Line',
    permission: PERMISSIONS.PAYROLL_VIEW,
  },
  {
    id:         'reports',
    label:      'Reports',
    path:       '/reports',
    icon:       'RiBarChartLine',
    permission: PERMISSIONS.REPORTS_VIEW_GENERAL,
  },
  {
    id:         'settings',
    label:      'Settings',
    path:       '/settings',
    icon:       'RiSettingsLine',
    permission: PERMISSIONS.SETTINGS_MANAGE,
  },
]

// ─────────────────────────────────────────────────────────────
// PAGINATION DEFAULTS
// ─────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE:      1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
}

// ─────────────────────────────────────────────────────────────
// SUPABASE STORAGE BUCKETS
// ─────────────────────────────────────────────────────────────
export const STORAGE_BUCKETS = {
  EMPLOYEE_PHOTOS: 'employee-photos',
  COMPANY_ASSETS:  'company-assets',
}

// ─────────────────────────────────────────────────────────────
// MONTHS  (for payroll month selectors)
// ─────────────────────────────────────────────────────────────
export const MONTHS = [
  { value: 1,  label: 'January' },
  { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },
  { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },
  { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },
  { value: 8,  label: 'August' },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

// ─────────────────────────────────────────────────────────────
// DATE FORMATS  (used with Day.js — never use native Date.toLocaleDateString)
// ─────────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  DISPLAY:       'DD MMM YYYY',       // 01 Jan 2025
  DISPLAY_SHORT: 'DD MMM',            // 01 Jan
  DISPLAY_LONG:  'DD MMMM YYYY',      // 01 January 2025
  INPUT:         'YYYY-MM-DD',        // HTML date input value
  MONTH_YEAR:    'MMMM YYYY',         // January 2025
  TIME_12H:      'hh:mm A',           // 09:30 AM
  TIME_24H:      'HH:mm',             // 09:30
  DATETIME:      'DD MMM YYYY HH:mm', // 01 Jan 2025 09:30
  ISO:           'YYYY-MM-DD',        // ISO date string for Supabase
}

// ─────────────────────────────────────────────────────────────
// CURRENCY
// ─────────────────────────────────────────────────────────────
export const CURRENCY = {
  CODE:   'INR',
  SYMBOL: '₹',
  LOCALE: 'en-IN',
}
