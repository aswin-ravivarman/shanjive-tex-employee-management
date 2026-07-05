/**
 * ReportsPage.jsx
 * ---------------
 * Interactive Reports, Customized Dashboards & Multi-Format Exports (CSV, PDF, Word)
 * Tabs: Attendance, Wages & Salary, Leave Analytics, Duty Summary Report
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  RiBarChartLine,
  RiCalendarCheckLine,
  RiCoinsLine,
  RiCalendarEventLine,
  RiFilter3Line,
  RiFileTextLine,
  RiFilePdfLine,
  RiTableLine,
  RiPlayLine,
  RiCheckboxLine,
  RiCheckboxBlankLine
} from 'react-icons/ri'
import dayjs from 'dayjs'
import { 
  getReportCompanySettings, 
  getReportEmployees, 
  getReportAttendance, 
  getReportWages, 
  getReportLeaves, 
  getReportDutySummary 
} from '@/services/reportsService'
import { getActiveDepartments } from '@/services/employeeService'
import { formatCurrency, formatDate } from '@/utils/formatters'
import companyLogo from '@/assets/sanjiv tex logo .png'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'

// Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Pie, Doughnut } from 'react-chartjs-2'

// UI Parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

import './ReportsPage.css'

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function ReportsPage() {
  const { appUser } = useAuth()
  const { hasPermission } = usePermission()
  const canViewAttendanceReport = hasPermission('reports.view_attendance')
  const canViewLeaveAnalytics = hasPermission('reports.view_leaves')
  const canViewDutySummary = hasPermission('reports.view_duty_summary')
  const canViewPayrollReports = hasPermission(PERMISSIONS.REPORTS_VIEW_PAYROLL)
  const [activeTab, setActiveTab] = useState('attendance')

  // Set default active tab dynamically based on first available report permission
  useEffect(() => {
    if (!canViewAttendanceReport) {
      if (canViewLeaveAnalytics) {
        setActiveTab('leaves')
      } else if (canViewDutySummary) {
        setActiveTab('duty_summary')
      } else if (canViewPayrollReports) {
        setActiveTab('wages')
      }
    }
  }, [canViewAttendanceReport, canViewLeaveAnalytics, canViewDutySummary, canViewPayrollReports])
  const [loading, setLoading] = useState(false)
  const [dataList, setDataList] = useState([])
  const [departments, setDepartments] = useState([])
  const [companySettings, setCompanySettings] = useState(null)

  // Shared Filter States (attendance, wages, leaves)
  const [deptId, setDeptId] = useState('')
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'))

  // ── Duty Summary Tab Own State ───────────────────────────────────
  const [dsStartDate, setDsStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [dsEndDate, setDsEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [dsAllEmps, setDsAllEmps] = useState([])
  const [dsSelectedIds, setDsSelectedIds] = useState([])
  const [dsReport, setDsReport] = useState([])
  const [dsLoading, setDsLoading] = useState(false)

  // Load Departments dropdown
  useEffect(() => {
    getActiveDepartments().then(({ data }) => {
      if (data) {
        setDepartments([
          { value: '', label: 'All Departments' },
          ...data.map(d => ({ value: d.id, label: d.name }))
        ])
      }
    })
  }, [])

  // Load Company Settings
  useEffect(() => {
    getReportCompanySettings()
      .then(({ data }) => {
        if (data) setCompanySettings(data)
      })
  }, [])

  // Load employees for Duty Summary checklist (once on mount)
  useEffect(() => {
    getReportEmployees()
      .then(({ data }) => {
        if (data) {
          setDsAllEmps(data)
          setDsSelectedIds(data.map(e => e.id)) // Select all by default
        }
      })
  }, [])

  // ─────────────────────────────────────────────────────────────
  // REPORT DATA LOADER (attendance / wages / leaves)
  // ─────────────────────────────────────────────────────────────
  const loadReportData = useCallback(async () => {
    if (activeTab === 'duty_summary') return // Duty summary has its own generate button
    setLoading(true)
    try {
      if (activeTab === 'attendance') {
        const { data, error } = await getReportAttendance(startDate, endDate, deptId)
        if (error) throw error
        setDataList(data || [])

      } else if (activeTab === 'wages') {
        const { data, error } = await getReportWages(selectedMonth, deptId)
        if (error) throw error
        setDataList(data || [])

      } else if (activeTab === 'leaves') {
        const { data, error } = await getReportLeaves(startDate, endDate, deptId)
        if (error) throw error
        setDataList(data || [])
      }
    } catch (err) {
      toast.error('Failed to generate report list: ' + err.message)
    }
    setLoading(false)
  }, [activeTab, deptId, startDate, endDate, selectedMonth])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  // ─────────────────────────────────────────────────────────────
  // DUTY SUMMARY GENERATOR (triggered by "Generate Report" button)
  // ─────────────────────────────────────────────────────────────
  async function generateDutySummary() {
    if (dsSelectedIds.length === 0) {
      toast.info('Please select at least one employee.')
      return
    }
    setDsLoading(true)
    try {
      const { data, error } = await getReportDutySummary(dsSelectedIds, dsStartDate, dsEndDate, dsAllEmps)
      if (error) throw error

      setDsReport(data || [])
    } catch (err) {
      toast.error('Failed to generate duty summary: ' + err.message)
    }
    setDsLoading(false)
  }

  // ─────────────────────────────────────────────────────────────
  // DUTY SUMMARY CHECKLIST HELPERS
  // ─────────────────────────────────────────────────────────────
  const allSelected = dsAllEmps.length > 0 && dsSelectedIds.length === dsAllEmps.length

  function toggleSelectAll() {
    if (allSelected) {
      setDsSelectedIds([])
    } else {
      setDsSelectedIds(dsAllEmps.map(e => e.id))
    }
  }

  function toggleEmp(id) {
    setDsSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ─────────────────────────────────────────────────────────────
  // CHARTS GENERATORS (TAB-SPECIFIC DATA PREPARATION)
  // ─────────────────────────────────────────────────────────────
  const getAttendanceChartData = () => {
    const presentCount = dataList.filter(item => item.status === 'present').length
    const absentCount = dataList.filter(item => item.status === 'absent').length
    const leaveCount = dataList.filter(item => item.status === 'leave').length

    return {
      pieData: {
        labels: ['Present', 'Absent', 'On Leave'],
        datasets: [
          {
            label: 'Duty Status Ratio',
            data: [presentCount, absentCount, leaveCount],
            backgroundColor: ['#16A34A', '#DC2626', '#0891B2'],
            borderWidth: 1,
          }
        ]
      },
      deptBarData: {
        labels: departments.filter(d => d.value !== '').map(d => d.label),
        datasets: [
          {
            label: 'Total Logs In Selected Range',
            data: departments.filter(d => d.value !== '').map(d => {
              return dataList.filter(item => item.employees?.department_id === d.value).length
            }),
            backgroundColor: '#2563EB',
          }
        ]
      }
    }
  }

  const getWagesChartData = () => {
    const names = dataList.map(item => item.full_name)
    const payables = dataList.map(item => item.final_payable)
    const totalWages = dataList.reduce((acc, curr) => acc + curr.calculated_salary, 0)
    const totalAdvances = dataList.reduce((acc, curr) => acc + curr.advance_paid, 0)

    return {
      barData: {
        labels: names.slice(0, 10),
        datasets: [
          {
            label: 'Net Payable (INR)',
            data: payables.slice(0, 10),
            backgroundColor: '#16A34A',
          }
        ]
      },
      doughnutData: {
        labels: ['Net Salary Disbursals', 'Advance Paid Out'],
        datasets: [
          {
            data: [totalWages - totalAdvances, totalAdvances],
            backgroundColor: ['#2563EB', '#DC2626'],
            borderWidth: 1,
          }
        ]
      }
    }
  }

  const getLeaveChartData = () => {
    const typeMap = {}
    dataList.forEach(item => {
      const typeName = item.leave_types?.name || 'Other'
      typeMap[typeName] = (typeMap[typeName] || 0) + Number(item.total_days)
    })

    return {
      pieData: {
        labels: Object.keys(typeMap),
        datasets: [
          {
            label: 'Leave Days Allocation Ratio',
            data: Object.values(typeMap),
            backgroundColor: ['#0891B2', '#D97706', '#2563EB', '#DC2626'],
            borderWidth: 1,
          }
        ]
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORTS — Employee Code removed from all exports
  // ─────────────────────────────────────────────────────────────

  // CSV Export
  function exportCSV() {
    if (activeTab === 'duty_summary') {
      if (dsReport.length === 0) {
        toast.info('Generate the report first before exporting.')
        return
      }
      const headers = ['Employee Name', 'Total Duty', 'Advance Outstanding (INR)']
      const rows = dsReport.map(item => [
        item.full_name,
        item.total_duty,
        item.advance_outstanding > 0 ? item.advance_outstanding.toFixed(2) : '—'
      ])
      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')
      downloadFile(csvContent, `duty_summary_report_${dayjs().format('YYYYMMDD')}.csv`, 'text/csv;charset=utf-8;')
      toast.success('Duty Summary exported to CSV.')
      return
    }

    if (dataList.length === 0) {
      toast.info('No data available to export.')
      return
    }

    let csvContent = ''
    const filename = `${activeTab}_report_${dayjs().format('YYYYMMDD')}.csv`

    if (activeTab === 'attendance') {
      // Code column removed from export
      const headers = ['Date', 'Employee Name', 'Department', 'Status', 'Shift', 'Remarks']
      const rows = dataList.map(item => [
        item.attendance_date,
        item.employees.full_name,
        item.employees.departments?.name || '—',
        item.status,
        item.shifts?.name || '—',
        item.remarks || ''
      ])
      csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')

    } else if (activeTab === 'wages') {
      // Code column removed from export
      const headers = ['Employee Name', 'Department', 'Total Duty (Days)', 'Rate/Day (INR)', 'Gross Salary', 'Advance Paid', 'Net Payable']
      const rows = dataList.map(item => [
        item.full_name,
        item.department,
        item.total_duty,
        item.salary_fixed,
        item.calculated_salary,
        item.advance_paid,
        item.final_payable
      ])
      csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')

    } else if (activeTab === 'leaves') {
      // Code column removed from export
      const headers = ['Start Date', 'End Date', 'Duration', 'Employee Name', 'Department', 'Type', 'Reason']
      const rows = dataList.map(item => [
        item.start_date,
        item.end_date,
        item.total_days,
        item.employees.full_name,
        item.employees.departments?.name || '—',
        item.leave_types?.name || '—',
        item.reason || ''
      ])
      csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')
    }

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
    toast.success('Report exported to CSV.')
  }

  // ─── Helper: load logo as base64 for embedding in Word docs ────
  async function getLogoBase64() {
    try {
      const response = await fetch(companyLogo)
      const blob = await response.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch {
      return '' // fallback: no image
    }
  }

  // Word Document (.doc) Export
  async function exportWord() {
    const logoBase64 = await getLogoBase64()

    if (activeTab === 'duty_summary') {
      if (dsReport.length === 0) {
        toast.info('Generate the report first before exporting.')
        return
      }
      const titleText = `DUTY SUMMARY REPORT`
      let tableHtml = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; font-size: 11px;">`
      tableHtml += `<tr style="background: #f0e6ff; color: #5b21b6;"><th>Employee Name</th><th>Total Duty</th><th>Advance Outstanding (INR)</th></tr>`
      dsReport.forEach(item => {
        tableHtml += `
          <tr>
            <td>${item.full_name}</td>
            <td>${item.total_duty}</td>
            <td>${item.advance_outstanding > 0 ? item.advance_outstanding.toFixed(2) : '—'}</td>
          </tr>`
      })
      tableHtml += `</table>`
      const period = `${dsStartDate} to ${dsEndDate}`
      const docHtml = buildWordDoc(titleText, period, tableHtml, logoBase64)
      downloadFile('\ufeff' + docHtml, `duty_summary_report_${dayjs().format('YYYYMMDD')}.doc`, 'application/msword')
      toast.success('Duty Summary exported to Word Document (.doc).')
      return
    }

    if (dataList.length === 0) {
      toast.info('No data available to export.')
      return
    }

    const titleText = `${activeTab.toUpperCase()} REPORT`
    let tableHtml = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; font-size: 11px;">`

    if (activeTab === 'attendance') {
      tableHtml += `
        <tr style="background: #f0e6ff; color: #5b21b6;">
          <th>Date</th><th>Employee Name</th><th>Department</th><th>Status</th><th>Shift</th><th>Remarks</th>
        </tr>
      `
      dataList.forEach(item => {
        tableHtml += `
          <tr>
            <td>${item.attendance_date}</td>
            <td>${item.employees.full_name}</td>
            <td>${item.employees.departments?.name || '—'}</td>
            <td style="text-transform: capitalize;">${item.status}</td>
            <td>${item.shifts?.name || '—'}</td>
            <td>${item.remarks || '—'}</td>
          </tr>
        `
      })
    } else if (activeTab === 'wages') {
      tableHtml += `
        <tr style="background: #f0e6ff; color: #5b21b6;">
          <th>Employee Name</th><th>Department</th><th>Total Duty</th><th>Gross Salary</th><th>Advance Paid</th><th>Net Payable</th>
        </tr>
      `
      dataList.forEach(item => {
        tableHtml += `
          <tr>
            <td>${item.full_name}</td>
            <td>${item.department}</td>
            <td>${item.total_duty}</td>
            <td>INR ${item.calculated_salary}</td>
            <td>INR ${item.advance_paid}</td>
            <td style="font-weight: bold;">INR ${item.final_payable}</td>
          </tr>
        `
      })
    } else if (activeTab === 'leaves') {
      tableHtml += `
        <tr style="background: #f0e6ff; color: #5b21b6;">
          <th>Start Date</th><th>End Date</th><th>Duration</th><th>Employee</th><th>Type</th><th>Reason</th>
        </tr>
      `
      dataList.forEach(item => {
        tableHtml += `
          <tr>
            <td>${item.start_date}</td>
            <td>${item.end_date}</td>
            <td>${item.total_days} days</td>
            <td>${item.employees.full_name}</td>
            <td>${item.leave_types?.name}</td>
            <td>${item.reason || ''}</td>
          </tr>
        `
      })
    }
    tableHtml += `</table>`

    const period = activeTab === 'wages' ? selectedMonth : `${startDate} to ${endDate}`
    const docHtml = buildWordDoc(titleText, period, tableHtml, logoBase64)
    downloadFile('\ufeff' + docHtml, `${activeTab}_report_${dayjs().format('YYYYMMDD')}.doc`, 'application/msword')
    toast.success('Report exported to Word Document (.doc).')
  }

  // Print PDF Export
  function exportPDF() {
    const originalTitle = document.title
    const dateStr = dayjs().format('YYYYMMDD')
    document.title = `${activeTab}_report_${dateStr}`

    window.print()

    setTimeout(() => {
      document.title = originalTitle
    }, 100)
  }

  // ── Shared export helpers ────────────────────────────────────
  function buildWordDoc(title, period, tableHtml, logoBase64 = '') {
    const logoImg = logoBase64
      ? `<img src="${logoBase64}" width="70" height="70" alt="Shanjive Tex" style="width: 70px; height: 70px; display: block; margin: 0 auto 6px auto;" />`
      : ''

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Shanjive Tex — ${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 1in;
          }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .doc-header { text-align: center; padding: 20px 30px 10px 30px; }
          .doc-divider { height: 3px; background: linear-gradient(90deg, #8e44ad, #c9a96e, #8e44ad); margin: 0 30px 20px 30px; }
          .doc-body { padding: 0 30px 20px 30px; }
          .doc-footer { text-align: center; padding: 15px 30px; margin-top: 30px; border-top: 2px solid #8e44ad; }
          .doc-footer p { margin: 3px 0; font-size: 9pt; color: #5b21b6; }
          .doc-footer .gst { font-weight: bold; font-size: 10pt; color: #4c1d95; }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="doc-header">
          ${logoImg}
          <h2 style="margin: 0; font-size: 20pt; font-weight: 900; color: #6d28d9; letter-spacing: 3px;">${companySettings?.company_name?.toUpperCase() || 'SHANJIVE TEX'}</h2>
          <p style="margin: 4px 0; font-size: 10pt; font-weight: bold; color: #8e44ad; text-transform: uppercase; letter-spacing: 2px;">${title}</p>
          <p style="margin: 2px 0; font-size: 9pt; color: #888;">Period: ${period}</p>
          <p style="margin: 2px 0; font-size: 8pt; color: #aaa;">Generated on: ${dayjs().format('DD MMM YYYY, HH:mm')}</p>
        </div>

        <!-- DIVIDER -->
        <div class="doc-divider"></div>

        <!-- TABLE -->
        <div class="doc-body">
          ${tableHtml}
        </div>

        <!-- FOOTER -->
        <div class="doc-footer">
          <p style="font-size: 8pt; color: #8e44ad; margin-bottom: 6px; letter-spacing: 1px;">
            &#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#10022;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;
          </p>
          <p class="gst">GST: ${companySettings?.gst_number || '33OKDPS4191B1Z0'}</p>
          <p>&#128205; ${companySettings?.address || 'D.No.108/3, Kumarapalayam Main Road, Senguttaipalayam, Kumarapalayam Thakuk, Namakkal District — Pin 638-008'}</p>
          <p>&#128222; ${companySettings?.phone || '+91 82208 06062'} &nbsp;&nbsp;&#9993; ${companySettings?.email || 'shanjivetex@gmail.com'}</p>
        </div>
      </body>
      </html>
    `
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMNS — Code column stays in UI, hidden on print
  // ─────────────────────────────────────────────────────────────
  const attendanceColumns = [
    {
      key: 'date',
      title: 'Date',
      render: (row) => <span>{formatDate(row.attendance_date)}</span>
    },
    {
      key: 'code',
      className: 'rep-no-print-col',
      title: <span className="rep-no-print-col">Code</span>,
      render: (row) => <span className="rep-no-print-col" style={{ fontWeight: 'bold' }}>{row.employees.employee_code}</span>
    },
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span>{row.employees.full_name}</span>
    },
    {
      key: 'dept',
      title: 'Department',
      render: (row) => <span>{row.employees.departments?.name || '—'}</span>
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <span style={{ textTransform: 'capitalize' }}>{row.status}</span>
    },
    {
      key: 'shift',
      title: 'Shift',
      render: (row) => <span>{row.shifts?.name || '—'}</span>
    },
    {
      key: 'remarks',
      title: 'Remarks',
      render: (row) => <span>{row.remarks || '—'}</span>
    }
  ]

  const wagesColumns = [
    {
      key: 'code',
      className: 'rep-no-print-col',
      title: <span className="rep-no-print-col">Code</span>,
      render: (row) => <span className="rep-no-print-col" style={{ fontWeight: 'bold' }}>{row.employee_code}</span>
    },
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span>{row.full_name}</span>
    },
    {
      key: 'dept',
      title: 'Department',
      render: (row) => <span>{row.department}</span>
    },
    {
      key: 'duty',
      title: 'Total Duty (Days)',
      render: (row) => <span>{row.total_duty}</span>
    },
    {
      key: 'rate',
      title: 'Fixed Rate/Day',
      render: (row) => <span>{formatCurrency(row.salary_fixed)}</span>
    },
    {
      key: 'gross',
      title: 'Gross Salary',
      render: (row) => <span>{formatCurrency(row.calculated_salary)}</span>
    },
    {
      key: 'adv',
      title: 'Advance Deducted',
      render: (row) => <span style={{ color: 'var(--color-danger)' }}>-{formatCurrency(row.advance_paid)}</span>
    },
    {
      key: 'net',
      title: 'Net Payable',
      render: (row) => <span style={{ fontWeight: 'bold', color: 'var(--color-success-dark)' }}>{formatCurrency(row.final_payable)}</span>
    },
  ]

  const leaveColumns = [
    {
      key: 'start',
      title: 'Start Date',
      render: (row) => <span>{formatDate(row.start_date)}</span>
    },
    {
      key: 'end',
      title: 'End Date',
      render: (row) => <span>{formatDate(row.end_date)}</span>
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (row) => <span>{row.total_days} days</span>
    },
    {
      key: 'code',
      className: 'rep-no-print-col',
      title: <span className="rep-no-print-col">Code</span>,
      render: (row) => <span className="rep-no-print-col" style={{ fontWeight: 'bold' }}>{row.employees.employee_code}</span>
    },
    {
      key: 'name',
      title: 'Employee',
      render: (row) => <span>{row.employees.full_name}</span>
    },
    {
      key: 'type',
      title: 'Type',
      render: (row) => <span>{row.leave_types?.name}</span>
    },
    {
      key: 'reason',
      title: 'Reason',
      render: (row) => <span className="rep-cell-reason">{row.reason || '—'}</span>
    },
  ]

  const dutySummaryColumns = [
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span style={{ fontWeight: 'var(--font-semibold)' }}>{row.full_name}</span>
    },
    {
      key: 'total_duty',
      title: 'Total Duty',
      render: (row) => (
        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
          {row.total_duty.toFixed(1)}
        </span>
      )
    },
    {
      key: 'advance_outstanding',
      title: 'Advance Outstanding',
      render: (row) => row.advance_outstanding > 0
        ? <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>
            {formatCurrency(row.advance_outstanding)}
          </span>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
    },
  ]

  const attCharts = activeTab === 'attendance' ? getAttendanceChartData() : null
  const wgsCharts = activeTab === 'wages' ? getWagesChartData() : null
  const leaveCharts = activeTab === 'leaves' ? getLeaveChartData() : null

  // Current table columns + data based on active tab
  const currentColumns = activeTab === 'attendance'
    ? attendanceColumns
    : activeTab === 'wages'
    ? wagesColumns
    : activeTab === 'leaves'
    ? leaveColumns
    : dutySummaryColumns

  const currentData = activeTab === 'duty_summary' ? dsReport : dataList
  const currentLoading = activeTab === 'duty_summary' ? dsLoading : loading

  return (
    <div className="page-wrapper rep-wrapper printable-area">
      
      {/* ── PRINT LAYOUT TABLE (repeats header/footer on every page) ── */}
      <table className="print-layout-table">
        <thead className="print-layout-thead">
          <tr className="print-layout-tr">
            <td className="print-layout-td">
              {/* ── PRINT-ONLY FIXED HEADER ─ */}
              <div className="rep-printable-title-sheet">
                <div className="rep-print-header">
                  <img src={companyLogo} width="60" height="60" alt="Shanjive Tex" className="rep-print-logo" style={{ width: '60px', height: '60px', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                  <h2 className="rep-print-company">SHANJIVE TEX</h2>
                  <p className="rep-print-report-label">
                    {activeTab === 'duty_summary' ? 'DUTY SUMMARY' : activeTab.toUpperCase()} REPORT
                  </p>
                  <p className="rep-print-period">
                    Period:{' '}
                    {activeTab === 'wages'
                      ? selectedMonth
                      : activeTab === 'duty_summary'
                      ? `${dsStartDate} to ${dsEndDate}`
                      : `${startDate} to ${endDate}`}
                  </p>
                </div>
                <div className="rep-print-divider" />
              </div>
            </td>
          </tr>
        </thead>

        <tbody className="print-layout-tbody">
          <tr className="print-layout-tr">
            <td className="print-layout-td">

      {/* ── SCREEN HEADER ──────────────────────────────────────────── */}
      <header className="rep-header non-printable">
        <div>
          <h2 className="rep-title">Reports &amp; Analytics Center</h2>
          <p className="rep-subtitle">Compile detailed spreadsheets, audit charts, and export multi-format files.</p>
        </div>
        <div className="rep-export-actions">
          <Button variant="secondary" icon={<RiFileTextLine />} onClick={exportCSV}>CSV</Button>
          <Button variant="secondary" icon={<RiFileTextLine />} onClick={exportWord}>Word</Button>
          <Button variant="primary" icon={<RiFilePdfLine />} onClick={exportPDF}>Print PDF</Button>
        </div>
      </header>

      {/* ── TABS ──────────────────────────────────────────────────── */}
      <div className="rep-tabs non-printable">
        {canViewAttendanceReport && (
          <button
            className={`rep-tab ${activeTab === 'attendance' ? 'rep-tab--active' : ''}`}
            onClick={() => { setActiveTab('attendance'); setDataList([]) }}
          >
            <RiCalendarCheckLine className="rep-tab-icon" /> Attendance Dashboard
          </button>
        )}
        {canViewPayrollReports && (
          <button
            className={`rep-tab ${activeTab === 'wages' ? 'rep-tab--active' : ''}`}
            onClick={() => { setActiveTab('wages'); setDataList([]) }}
          >
            <RiCoinsLine className="rep-tab-icon" /> Wages &amp; Salary Sheet
          </button>
        )}
        {canViewLeaveAnalytics && (
          <button
            className={`rep-tab ${activeTab === 'leaves' ? 'rep-tab--active' : ''}`}
            onClick={() => { setActiveTab('leaves'); setDataList([]) }}
          >
            <RiCalendarEventLine className="rep-tab-icon" /> Leave Analytics
          </button>
        )}
        {canViewDutySummary && (
          <button
            className={`rep-tab ${activeTab === 'duty_summary' ? 'rep-tab--active' : ''}`}
            onClick={() => { setActiveTab('duty_summary'); setDsReport([]) }}
          >
            <RiTableLine className="rep-tab-icon" /> Duty Summary Report
          </button>
        )}
      </div>

      {/* ── FILTER PANEL (attendance / wages / leaves) ─────────────── */}
      {activeTab !== 'duty_summary' && (
        <div className="rep-filter-panel non-printable">
          <div className="rep-filter-group">
            <RiFilter3Line className="rep-filter-lead-icon" />

            <div className="rep-input-wrap">
              <span className="rep-label">Department:</span>
              <Input
                type="select"
                name="dept"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                options={departments}
                className="rep-select-input"
              />
            </div>

            {activeTab !== 'wages' ? (
              <>
                <div className="rep-input-wrap">
                  <span className="rep-label">Start Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rep-date-picker"
                  />
                </div>
                <div className="rep-input-wrap">
                  <span className="rep-label">End Date:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rep-date-picker"
                  />
                </div>
              </>
            ) : (
              <div className="rep-input-wrap">
                <span className="rep-label">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rep-date-picker"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DUTY SUMMARY FILTER PANEL ─────────────────────────────── */}
      {activeTab === 'duty_summary' && (
        <div className="rep-filter-panel rep-ds-panel non-printable">
          {/* Date range row */}
          <div className="rep-filter-group rep-ds-dates">
            <RiFilter3Line className="rep-filter-lead-icon" />
            <div className="rep-input-wrap">
              <span className="rep-label">Start Date:</span>
              <input
                type="date"
                value={dsStartDate}
                onChange={(e) => setDsStartDate(e.target.value)}
                className="rep-date-picker"
              />
            </div>
            <div className="rep-input-wrap">
              <span className="rep-label">End Date:</span>
              <input
                type="date"
                value={dsEndDate}
                onChange={(e) => setDsEndDate(e.target.value)}
                className="rep-date-picker"
              />
            </div>
            <div className="rep-ds-generate-btn">
              <Button
                variant="primary"
                icon={<RiPlayLine />}
                onClick={generateDutySummary}
                loading={dsLoading}
              >
                Generate Report
              </Button>
            </div>
          </div>

          {/* Employee checklist */}
          <div className="rep-ds-checklist-section">
            <p className="rep-label" style={{ marginBottom: '8px' }}>Select Employees:</p>
            <div className="rep-ds-checklist">
              {/* Select All row */}
              <label className="rep-ds-check-item rep-ds-check-item--all" onClick={toggleSelectAll}>
                <span className="rep-ds-check-icon">
                  {allSelected ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                </span>
                <span className="rep-ds-check-label">Select All ({dsAllEmps.length})</span>
              </label>
              {/* Individual employees */}
              {dsAllEmps.map(emp => {
                const checked = dsSelectedIds.includes(emp.id)
                return (
                  <label key={emp.id} className="rep-ds-check-item" onClick={() => toggleEmp(emp.id)}>
                    <span className="rep-ds-check-icon">
                      {checked ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                    </span>
                    <span className="rep-ds-check-label">{emp.full_name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CHART DASHBOARDS (attendance / wages / leaves) ─────────── */}
      {dataList.length > 0 && activeTab !== 'duty_summary' && (
        <section className="rep-chart-dashboard">
          {activeTab === 'attendance' && attCharts && (
            <div className="rep-chart-grid">
              <div className="rep-chart-card">
                <h4 className="rep-chart-title">Duty Status Ratios</h4>
                <div className="rep-chart-wrap-pie">
                  <Pie data={attCharts.pieData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
              <div className="rep-chart-card rep-chart-card--large">
                <h4 className="rep-chart-title">Total Logs by Department</h4>
                <div className="rep-chart-wrap-bar">
                  <Bar data={attCharts.deptBarData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wages' && wgsCharts && (
            <div className="rep-chart-grid">
              <div className="rep-chart-card">
                <h4 className="rep-chart-title">Wages vs. Advances Allocation</h4>
                <div className="rep-chart-wrap-pie">
                  <Doughnut data={wgsCharts.doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
              <div className="rep-chart-card rep-chart-card--large">
                <h4 className="rep-chart-title">Top Net Payables (Top 10 Employees)</h4>
                <div className="rep-chart-wrap-bar">
                  <Bar data={wgsCharts.barData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaves' && leaveCharts && (
            <div className="rep-chart-grid">
              <div className="rep-chart-card">
                <h4 className="rep-chart-title">Leaves Taken Ratio By Type (Days)</h4>
                <div className="rep-chart-wrap-pie">
                  <Pie data={leaveCharts.pieData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── REPORT TABLE ───────────────────────────────────────────── */}
      <div className="rep-table-section">
        <Table
          columns={currentColumns}
          data={currentData}
          loading={currentLoading}
          emptyMessage={
            activeTab === 'duty_summary'
              ? 'Click "Generate Report" to compute duty totals for selected employees.'
              : 'No reports found matching selected criteria. Adjust filters above.'
          }
        />
      </div>

      {/* ── COMPANY FOOTER (shown on screen + print) ────────────────── */}
            </td>
          </tr>
        </tbody>

        <tfoot className="print-layout-tfoot">
          <tr className="print-layout-tr">
            <td className="print-layout-td">
              <div className="rep-company-footer">
        <div className="rep-footer-flourish">
          <svg viewBox="0 0 500 24" className="rep-footer-svg" preserveAspectRatio="none">
            <path d="M0,12 Q62,0 125,12 Q188,24 250,12 Q312,0 375,12 Q438,24 500,12"
              fill="none" stroke="#8e44ad" strokeWidth="1.8"/>
            <path d="M0,12 Q62,4 125,12 Q188,20 250,12 Q312,4 375,12 Q438,20 500,12"
              fill="none" stroke="#c9a96e" strokeWidth="1"/>
          </svg>
          <span className="rep-footer-ornament rep-footer-ornament--left">&#10103;</span>
          <span className="rep-footer-ornament rep-footer-ornament--right">&#10103;</span>
        </div>
        <div className="rep-footer-info">
          <span className="rep-footer-gst">GST: {companySettings?.gst_number || '33OKDPS4191B1Z0'}</span>
          <span className="rep-footer-sep">&#10022;</span>
          <span className="rep-footer-addr">
            &#128205; {companySettings?.address || 'D.No.108/3, Kumarapalayam Main Road, Senguttaipalayam, Kumarapalayam Thakuk, Namakkal District — Pin 638-008'}
          </span>
        </div>
        <div className="rep-footer-contact">
          <span>&#128222; {companySettings?.phone || '+91 82208 06062'}</span>
          <span className="rep-footer-sep">&#10022;</span>
          <span>&#9993; {companySettings?.email || 'shanjivetex@gmail.com'}</span>
        </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
