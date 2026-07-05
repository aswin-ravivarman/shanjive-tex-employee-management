/**
 * Sidebar.jsx
 * -----------
 * Application sidebar with permission-aware navigation.
 *
 * Features:
 * - Collapsible (icon-only) on desktop
 * - Full-screen drawer on mobile
 * - Only shows menu items the current user has permission to see
 * - Active route highlighting via NavLink
 * - Company name as text logo at the top
 */

import { NavLink } from 'react-router-dom'
import companyLogo from '@/assets/sanjiv tex logo .png'
import {
  RxDashboard,
} from 'react-icons/rx'
import {
  RiTeamLine,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiBox3Line,
  RiMoneyDollarCircleLine,
  RiBarChartLine,
  RiSettingsLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiCloseLine,
  RiCoinsLine,
  RiFileList3Line,
} from 'react-icons/ri'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'
import './Sidebar.css'

// Icon map — avoids dynamic imports
const ICON_MAP = {
  RxDashboard:               RxDashboard,
  RiTeamLine:                RiTeamLine,
  RiCalendarCheckLine:       RiCalendarCheckLine,
  RiCalendarEventLine:       RiCalendarEventLine,
  RiBox3Line:                RiBox3Line,
  RiMoneyDollarCircleLine:   RiMoneyDollarCircleLine,
  RiBarChartLine:            RiBarChartLine,
  RiSettingsLine:            RiSettingsLine,
  RiCoinsLine:               RiCoinsLine,
  RiFileList3Line:           RiFileList3Line,
}

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  path: '/dashboard',  iconKey: 'RxDashboard',             permission: PERMISSIONS.DASHBOARD_VIEW },
  { id: 'employees',  label: 'Employees',  path: '/employees',  iconKey: 'RiTeamLine',               permission: PERMISSIONS.EMPLOYEES_VIEW },
  { id: 'attendance', label: 'Attendance', path: '/attendance', iconKey: 'RiCalendarCheckLine',      permission: PERMISSIONS.ATTENDANCE_VIEW },
  { id: 'leave',      label: 'Leave',      path: '/leave',      iconKey: 'RiCalendarEventLine',      permission: PERMISSIONS.LEAVE_VIEW },

  { id: 'payroll',    label: 'Payroll',    path: '/payroll',    iconKey: 'RiMoneyDollarCircleLine',  permission: PERMISSIONS.PAYROLL_VIEW },
  { id: 'advances',   label: 'Advances Paid', path: '/advances', iconKey: 'RiCoinsLine',              permission: PERMISSIONS.ADVANCES_VIEW },
  { id: 'wages-summary', label: 'Wages Summary', path: '/wages-summary', iconKey: 'RiFileList3Line',  permission: PERMISSIONS.WAGES_SUMMARY_VIEW },
  { id: 'reports',    label: 'Reports',    path: '/reports',    iconKey: 'RiBarChartLine',           permission: PERMISSIONS.REPORTS_VIEW_GENERAL },
  { id: 'settings',   label: 'Settings',  path: '/settings',   iconKey: 'RiSettingsLine',           permission: PERMISSIONS.SETTINGS_MANAGE },
]

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { hasPermission } = usePermission()

  const visibleItems = NAV_ITEMS.filter(item => hasPermission(item.permission))

  return (
    <aside
      className={[
        'sidebar',
        collapsed    ? 'sidebar--collapsed' : '',
        mobileOpen   ? 'sidebar--mobile-open' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-mark" aria-hidden="true">
            <img src={companyLogo} alt="Shanjive Tex" className="sidebar-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-company-name">Shanjive Tex</span>
            <span className="sidebar-company-sub">HRMS</span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        >
          <RiCloseLine />
        </button>
      </div>

      {/* ── NAV ITEMS ─────────────────────────────────────────── */}
      <nav className="sidebar-nav sidebar-scroll" aria-label="Module navigation">
        <ul className="sidebar-nav-list">
          {visibleItems.map(item => {
            const Icon = ICON_MAP[item.iconKey]
            return (
              <li key={item.id} className="sidebar-nav-item">
                <NavLink
                  to={item.path}
                  id={`nav-${item.id}`}
                  className={({ isActive }) =>
                    ['sidebar-nav-link', isActive ? 'sidebar-nav-link--active' : ''].filter(Boolean).join(' ')
                  }
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">
                    {Icon && <Icon />}
                  </span>
                  <span className="sidebar-nav-label">{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          <span>Shanjive Tex © {new Date().getFullYear()}</span>
        </div>
      </div>
    </aside>
  )
}
