/**
 * AuthLayout.jsx
 * --------------
 * Layout wrapper for authentication pages (Login, Reset Password, etc.).
 * Split-panel design: branded left panel + form right panel.
 */

import { Outlet } from 'react-router-dom'
import './AuthLayout.css'

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      {/* LEFT — Brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          {/* Logo mark */}
          <div className="auth-logo-mark">
            <span className="auth-logo-letters">ST</span>
          </div>

          <div className="auth-brand-text">
            <h1 className="auth-company-name">Shanjive Tex</h1>
            <p className="auth-company-tagline">Employee Management System</p>
          </div>

          {/* Decorative feature list */}
          <ul className="auth-feature-list">
            <li className="auth-feature-item">
              <span className="auth-feature-dot"></span>
              Attendance & Leave tracking
            </li>
            <li className="auth-feature-item">
              <span className="auth-feature-dot"></span>
              Payroll & Salary management
            </li>
            <li className="auth-feature-item">
              <span className="auth-feature-dot"></span>
              Reports & Analytics
            </li>
          </ul>

          {/* Decorative circles */}
          <div className="auth-circle auth-circle-1" aria-hidden="true"></div>
          <div className="auth-circle auth-circle-2" aria-hidden="true"></div>
          <div className="auth-circle auth-circle-3" aria-hidden="true"></div>
        </div>
      </div>

      {/* RIGHT — Auth form (renders <Login /> via <Outlet />) */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
