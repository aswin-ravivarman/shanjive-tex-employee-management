/**
 * Navbar.jsx
 * ----------
 * Top navigation bar: sidebar toggle, page title, user avatar + dropdown.
 * Super Admin gets an extra "Edit Profile" option to update name & password.
 */

import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiMenuLine,
  RiLogoutBoxRLine,
  RiUserLine,
  RiArrowDownSLine,
  RiEditLine,
  RiLockPasswordLine,
  RiSaveLine,
} from 'react-icons/ri'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/utils/formatters'
import { updateUserProfile, updateUserPassword } from '@/services/authService'
import { toast } from 'react-toastify'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import './Navbar.css'

// Map route paths to page titles
const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/employees':     'Employee Management',
  '/attendance':    'Attendance',
  '/leave':         'Leave Management',

  '/payroll':       'Payroll',
  '/advances':      'Advances Paid',
  '/wages-summary': 'Wages Summary',
  '/reports':       'Reports',
  '/settings':      'Settings',
}

export default function Navbar({ onToggleSidebar, onToggleMobileSidebar, sidebarCollapsed }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { appUser, signOut } = useAuth()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef(null)

  // Edit Profile modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', new_password: '', confirm_password: '' })
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Shanjive Tex'
  const isSuperAdmin = appUser?.role === 'super_admin'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pre-fill name when modal opens
  useEffect(() => {
    if (editOpen) {
      setEditForm({ full_name: appUser?.full_name || '', new_password: '', confirm_password: '' })
      setEditErrors({})
    }
  }, [editOpen, appUser])

  async function handleSignOut() {
    setSigningOut(true)
    setDropdownOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  function openEditProfile() {
    setDropdownOpen(false)
    setEditOpen(true)
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
    if (editErrors[name]) setEditErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validateEdit() {
    const errs = {}
    if (!editForm.full_name.trim()) errs.full_name = 'Name is required'
    if (editForm.new_password && editForm.new_password.length < 6) {
      errs.new_password = 'Password must be at least 6 characters'
    }
    if (editForm.new_password && editForm.new_password !== editForm.confirm_password) {
      errs.confirm_password = 'Passwords do not match'
    }
    setEditErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!validateEdit()) return
    setSaving(true)
    try {
      // 1. Update display name in app_users table
      const { error: nameErr } = await updateUserProfile(appUser.id, editForm.full_name.trim())

      if (nameErr) throw new Error('Failed to update name: ' + nameErr.message)

      // 2. Update password in Supabase Auth if provided
      if (editForm.new_password) {
        const { error: pwErr } = await updateUserPassword(editForm.new_password)
        if (pwErr) throw new Error('Failed to update password: ' + pwErr.message)
      }

      toast.success('Profile updated successfully.')
      setEditOpen(false)

      // Reload page to reflect new name in navbar
      window.location.reload()
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const initials = getInitials(appUser?.full_name || appUser?.email || '')

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          {/* Desktop sidebar toggle */}
          <button
            id="navbar-sidebar-toggle"
            className="navbar-icon-btn navbar-sidebar-toggle--desktop"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed
              ? <RiMenuUnfoldLine aria-hidden="true" />
              : <RiMenuFoldLine  aria-hidden="true" />
            }
          </button>

          {/* Mobile hamburger */}
          <button
            id="navbar-mobile-menu-btn"
            className="navbar-icon-btn navbar-sidebar-toggle--mobile"
            onClick={onToggleMobileSidebar}
            aria-label="Open navigation menu"
          >
            <RiMenuLine aria-hidden="true" />
          </button>

          <h1 className="navbar-page-title">{pageTitle}</h1>
        </div>

        <div className="navbar-right">
          {/* User avatar + dropdown */}
          <div className="navbar-user" ref={dropdownRef}>
            <button
              id="navbar-user-btn"
              className="navbar-user-btn"
              onClick={() => setDropdownOpen(prev => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              aria-label="User menu"
            >
              <div className="navbar-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">{appUser?.full_name || 'User'}</span>
                <span className="navbar-user-role">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <RiArrowDownSLine
                className={`navbar-user-chevron ${dropdownOpen ? 'navbar-user-chevron--open' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="navbar-dropdown" role="menu">
                {/* User info header */}
                <div className="navbar-dropdown-header">
                  <div className="navbar-dropdown-avatar">{initials}</div>
                  <div className="navbar-dropdown-info">
                    <span className="navbar-dropdown-name">{appUser?.full_name}</span>
                    <span className="navbar-dropdown-email">{appUser?.email}</span>
                  </div>
                </div>

                <div className="navbar-dropdown-divider" />

                {/* Edit Profile — super_admin only */}
                {isSuperAdmin && (
                  <button
                    id="navbar-edit-profile-btn"
                    className="navbar-dropdown-item"
                    onClick={openEditProfile}
                    role="menuitem"
                  >
                    <RiEditLine aria-hidden="true" />
                    Edit Profile
                  </button>
                )}

                <div className="navbar-dropdown-divider" />

                {/* Sign out */}
                <button
                  id="navbar-signout-btn"
                  className="navbar-dropdown-item navbar-dropdown-item--danger"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  role="menuitem"
                >
                  <RiLogoutBoxRLine aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── EDIT PROFILE MODAL (super_admin only) ─────────────────── */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
        size="sm"
      >
        <form onSubmit={handleEditSubmit} className="navbar-edit-form">

          <div className="navbar-edit-section">
            <div className="navbar-edit-section-label">
              <RiUserLine /> Account Details
            </div>
            <Input
              type="text"
              label="Full Name"
              name="full_name"
              required
              value={editForm.full_name}
              onChange={handleEditChange}
              placeholder="Your display name"
              error={editErrors.full_name}
            />
          </div>

          <div className="navbar-edit-divider" />

          <div className="navbar-edit-section">
            <div className="navbar-edit-section-label">
              <RiLockPasswordLine /> Change Password
              <span className="navbar-edit-optional">(leave blank to keep current)</span>
            </div>
            <Input
              type="password"
              label="New Password"
              name="new_password"
              value={editForm.new_password}
              onChange={handleEditChange}
              placeholder="Min. 6 characters"
              error={editErrors.new_password}
            />
            <Input
              type="password"
              label="Confirm New Password"
              name="confirm_password"
              value={editForm.confirm_password}
              onChange={handleEditChange}
              placeholder="Repeat new password"
              error={editErrors.confirm_password}
            />
          </div>

          <div className="navbar-edit-actions">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" icon={<RiSaveLine />} loading={saving}>
              Save Changes
            </Button>
          </div>

        </form>
      </Modal>
    </>
  )
}
