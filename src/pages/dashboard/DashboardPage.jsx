/**
 * DashboardPage.jsx
 * ----------------
 * Full dashboard displaying Greeting header, Metric Cards, quick charts,
 * and a recent activity log feed.
 */

import { useState, useEffect } from 'react'
import {
  RiGroupLine,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiAlertLine,
  RiShieldUserLine,
  RiTimeLine
} from 'react-icons/ri'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getDashboardStats, getRecentActivityLogs } from '@/services/dashboardService'
import { formatDateTime } from '@/utils/formatters'
import Table from '@/components/common/Table'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import './DashboardPage.css'

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

export default function DashboardPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [generalLogs, setGeneralLogs] = useState([])
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [logTab, setLogTab] = useState('general')
  const [loading, setLoading] = useState(true)

  // 1. Localized Greeting
  const currentHour = dayjs().hour()
  let greeting = 'Welcome'
  if (currentHour < 12) greeting = 'Good morning'
  else if (currentHour < 17) greeting = 'Good afternoon'
  else greeting = 'Good evening'

  // 2. Load Stats
  useEffect(() => {
    let isMounted = true
    async function loadDashboard() {
      setLoading(true)
      const [statsRes, logsRes] = await Promise.all([
        getDashboardStats(),
        getRecentActivityLogs()
      ])

      if (isMounted) {
        if (statsRes.stats) setStats(statsRes.stats)
        if (logsRes.logs) {
          setGeneralLogs(logsRes.logs.generalLogs || [])
          setAttendanceLogs(logsRes.logs.attendanceLogs || [])
        }
        setLoading(false)
      }
    }
    loadDashboard()
    return () => { isMounted = false }
  }, [])

  // 3. Table Column Mappings
  const logColumns = [
    {
      key: 'user',
      title: 'User',
      render: (row) => (
        <div className="dash-log-user">
          <RiShieldUserLine className="dash-log-user-icon" />
          <div>
            <div className="dash-log-user-name">
              {row.app_users?.full_name || 'System'}
            </div>
            <div className="dash-log-user-role">
              {row.app_users?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'module',
      title: 'Module',
      render: (row) => (
        <span className="dash-log-module">{row.module}</span>
      )
    },
    {
      key: 'description',
      title: 'Action Details',
      render: (row) => (
        <span className="dash-log-desc">{row.description || row.action}</span>
      )
    },
    {
      key: 'occurred_at',
      title: 'Time',
      align: 'right',
      render: (row) => (
        <div className="dash-log-time">
          <RiTimeLine />
          <span>{formatDateTime(row.occurred_at)}</span>
        </div>
      )
    }
  ]

  // Render Skeleton Grid
  if (loading) {
    return (
      <div className="page-wrapper dash-wrapper">
        <div className="dash-shimmer-header" />
        <div className="dash-metrics-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="dash-shimmer-card" />
          ))}
        </div>
        <div className="dash-shimmer-table" />
      </div>
    )
  }

  // Attendance rate calculation
  const totalAtt = stats
    ? stats.attendanceToday.present +
      stats.attendanceToday.absent +
      stats.attendanceToday.halfDay +
      stats.attendanceToday.leave
    : 0
  const attendanceRate = totalAtt > 0
    ? Math.round((stats.attendanceToday.present / totalAtt) * 100)
    : 100

  return (
    <div className="page-wrapper dash-wrapper">
      
      {/* ── GREETING BANNER ───────────────────────────────────── */}
      <header className="dash-header">
        <div className="dash-greeting-box">
          <h2 className="dash-greeting">
            {greeting}, <span className="dash-username">{appUser?.full_name || 'Mohanraj'}</span>!
          </h2>
          <p className="dash-subtitle">
            Here's what is happening at Shanjive Tex today.
          </p>
        </div>
        <div className="dash-date-badge">
          <span>{dayjs().format('dddd, D MMMM YYYY')}</span>
        </div>
      </header>

      {/* ── METRICS GRID ──────────────────────────────────────── */}
      <section className="dash-metrics-grid">
        
        {/* Active Employees */}
        <div 
          className="dash-card dash-card-clickable" 
          onClick={() => navigate('/employees')}
          style={{ cursor: 'pointer' }}
          title="Click to view employees"
        >
          <div className="dash-card-header">
            <div className="dash-icon-wrap dash-icon-wrap--primary">
              <RiGroupLine />
            </div>
            <span className="dash-card-title">Employees</span>
          </div>
          <div className="dash-card-body">
            <h3 className="dash-card-value">{stats?.activeEmployees}</h3>
            <span className="dash-card-label">Active Staff Members</span>
          </div>
        </div>

        {/* Attendance Today */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-icon-wrap dash-icon-wrap--success">
              <RiCalendarCheckLine />
            </div>
            <span className="dash-card-title">Attendance Today</span>
          </div>
          <div className="dash-card-body">
            <h3 className="dash-card-value">{stats?.attendanceToday.present}</h3>
            <span className="dash-card-label">
              Present today ({attendanceRate}% rate)
            </span>
          </div>
        </div>

        {/* Leaves Today */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-icon-wrap dash-icon-wrap--info">
              <RiCalendarEventLine />
            </div>
            <span className="dash-card-title">Leaves Active</span>
          </div>
          <div className="dash-card-body">
            <h3 className="dash-card-value">{stats?.activeLeaves}</h3>
            <span className="dash-card-label">Staff on Leave Today</span>
          </div>
        </div>


      </section>

      {/* ── ADVANCED ANALYTICS CHARTS ─────────────────────────── */}
      <section className="dash-charts-section">
        <h3 className="dash-section-title">Operational Analytics</h3>
        <p className="dash-section-desc">Key visual indicators for daily workforce presence and store stock levels.</p>
        
        <div className="dash-charts-grid">
          <div className="dash-chart-card">
            <h4 className="dash-chart-card-title">Workforce Today</h4>
            <div className="dash-chart-canvas-wrap">
              <Doughnut
                data={{
                  labels: ['Present', 'Absent', 'On Leave'],
                  datasets: [{
                    data: [
                      stats?.attendanceToday.present || 0,
                      stats?.attendanceToday.absent || 0,
                      stats?.attendanceToday.leave || 0
                    ],
                    backgroundColor: ['#16A34A', '#DC2626', '#0891B2'],
                    borderWidth: 1
                  }]
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>

          <div className="dash-chart-card">
            <h4 className="dash-chart-card-title">Shift Distribution</h4>
            <div className="dash-chart-canvas-wrap">
              {stats?.shiftDistribution && Object.keys(stats.shiftDistribution).length > 0 ? (
                <Doughnut
                  data={{
                    labels: Object.keys(stats.shiftDistribution),
                    datasets: [{
                      data: Object.values(stats.shiftDistribution),
                      backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'],
                      borderWidth: 1
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No shift data today
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ── ACTIVITY LOGS TABLE ───────────────────────────────── */}
      <section className="dash-logs-section">
        <div className="dash-logs-header">
          <div className="dash-logs-title-row">
            <div>
              <h3 className="dash-section-title">Recent Activity Log</h3>
              <p className="dash-section-desc">Audit trail of latest administrative operations</p>
            </div>
            <div className="dash-log-tabs">
              <button
                className={`dash-log-tab ${logTab === 'general' ? 'dash-log-tab--active' : ''}`}
                onClick={() => setLogTab('general')}
              >
                System & Admin Logs
              </button>
              <button
                className={`dash-log-tab ${logTab === 'attendance' ? 'dash-log-tab--active' : ''}`}
                onClick={() => setLogTab('attendance')}
              >
                Attendance Logs
              </button>
            </div>
          </div>
        </div>
        
        <Table
          columns={logColumns}
          data={logTab === 'general' ? generalLogs : attendanceLogs}
          loading={false}
          emptyMessage={
            logTab === 'general'
              ? 'No recent administrative logs recorded.'
              : 'No recent attendance logs recorded.'
          }
        />
      </section>

    </div>
  )
}
