/**
 * DashboardLayout.jsx
 * -------------------
 * Main application shell: Sidebar + Navbar + page content area.
 * Full Sidebar and Navbar implementations are built in Module 5.
 * This version is functional enough for Module 4 to boot correctly.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Navbar  from '@/components/layout/Navbar'
import './DashboardLayout.css'

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarCollapsed(prev => !prev)
  }

  function toggleMobileSidebar() {
    setMobileSidebarOpen(prev => !prev)
  }

  function closeMobileSidebar() {
    setMobileSidebarOpen(false)
  }

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main area */}
      <div className="dashboard-main">
        <Navbar
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Page content */}
        <main className="dashboard-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
