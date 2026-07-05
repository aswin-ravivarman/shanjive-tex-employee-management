/**
 * Unauthorized.jsx
 * ----------------
 * Shown when a user tries to access a route they don't have
 * permission for (RoleRoute redirects here).
 */

import { useNavigate } from 'react-router-dom'
import { RiShieldLine, RiArrowLeftLine } from 'react-icons/ri'
import './Unauthorized.css'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-icon-wrap">
          <RiShieldLine className="unauthorized-icon" aria-hidden="true" />
        </div>
        <h1 className="unauthorized-code">403</h1>
        <h2 className="unauthorized-title">Access Denied</h2>
        <p className="unauthorized-message">
          You don't have permission to view this page.
          Contact your administrator if you believe this is an error.
        </p>
        <button
          id="unauthorized-back-btn"
          className="unauthorized-back-btn"
          onClick={() => navigate(-1)}
        >
          <RiArrowLeftLine aria-hidden="true" />
          Go back
        </button>
      </div>
    </div>
  )
}
