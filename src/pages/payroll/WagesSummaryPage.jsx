/**
 * WagesSummaryPage.jsx
 * -------------------
 * Real-time Monthly Wages & Salary Sheet Summary.
 * Aggregates attendance shift duties using shift_value from DB
 * (Shift 1 = 0.5, Shift 2 = 1.0, Shift 3 = 1.5, Shift 4 = 2.0)
 * and subtracts advance component deductions to show Net Pay.
 * Includes a premium UI to update the fixed daily salary rate of each employee.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { RiFileList3Line, RiCalendarLine, RiEditLine, RiSaveLine } from 'react-icons/ri'
import dayjs from 'dayjs'
import { getWagesSummaryData, updateFixedDailySalary } from '@/services/wagesSummaryService'
import { logActivity } from '@/services/activityLogService'
import { formatCurrency } from '@/utils/formatters'
import { usePermission } from '@/hooks/usePermission'

// UI Parts
import Table from '@/components/common/Table'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'

import './WagesSummaryPage.css'

export default function WagesSummaryPage() {
  const { appUser } = useAuth()
  const { hasPermission } = usePermission()
  const canManage = hasPermission('wages_summary.manage')
  const [wages, setWages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'))

  // Edit Salary Modal state
  const [salaryModal, setSalaryModal] = useState({ open: false, row: null })
  const [salaryForm, setSalaryForm] = useState({ basic_salary: '' })
  const [saving, setSaving] = useState(false)

  // Load monthly summary calculations
  const loadWages = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getWagesSummaryData(selectedMonth)
      if (error) throw error
      setWages(data || [])
    } catch (err) {
      toast.error('Failed to compute monthly wages: ' + err.message)
    }
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => {
    loadWages()
  }, [loadWages])

  // Open edit salary modal
  function openEditSalary(row) {
    setSalaryModal({ open: true, row })
    setSalaryForm({ basic_salary: row.salary_fixed || '' })
  }

  // Handle salary edit submission
  async function handleSalarySave(e) {
    e.preventDefault()
    const rate = Number(salaryForm.basic_salary)
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid positive daily rate.')
      return
    }

    setSaving(true)
    try {
      const empId = salaryModal.row.employee_id

      const { error } = await updateFixedDailySalary(empId, rate)
      if (error) throw error

      // 2. Log activity
      await logActivity(
        'payroll',
        'update',
        `Updated fixed daily salary rate for employee ${salaryModal.row.full_name} (${salaryModal.row.employee_code}) to INR ${rate.toFixed(2)}`
      )

      toast.success(`Wages rate updated successfully for ${salaryModal.row.full_name}.`)
      setSalaryModal({ open: false, row: null })
      loadWages()
    } catch (err) {
      toast.error('Failed to save daily rate: ' + err.message)
    }
    setSaving(false)
  }

  const columns = [
    {
      key: 'code',
      title: 'Code',
      render: (row) => <span className="wgs-table-code">{row.employee_code}</span>
    },
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span className="wgs-table-name">{row.full_name}</span>
    },
    {
      key: 'total_duty',
      title: 'Total Duty (Days)',
      render: (row) => <span className="wgs-table-duty">{row.total_duty.toFixed(1)}</span>
    },
    {
      key: 'salary_fixed',
      title: 'Salary Fixed (Per Day)',
      render: (row) => <span style={{ fontWeight: 'var(--font-semibold)' }}>{formatCurrency(row.salary_fixed)}</span>
    },
    {
      key: 'calculated_salary',
      title: 'Calculated Salary',
      render: (row) => <span>{formatCurrency(row.calculated_salary)}</span>
    },
    {
      key: 'advance_paid',
      title: 'Advance Paid',
      render: (row) => <span style={{ color: 'var(--color-danger)' }}>-{formatCurrency(row.advance_paid)}</span>
    },
    {
      key: 'final_payable',
      title: 'Net Payable',
      render: (row) => <span className="wgs-table-payable">{formatCurrency(row.final_payable)}</span>
    },
    {
      key: 'action',
      title: 'Actions',
      align: 'right',
      render: (row) => (
        canManage ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<RiEditLine />}
            onClick={() => openEditSalary(row)}
          >
            Set Rate
          </Button>
        ) : null
      )
    }
  ]

  // Calculate Grand Totals
  const totalEmployees = wages.length
  const totalDuties = wages.reduce((sum, w) => sum + (w.total_duty || 0), 0)
  const totalCalculatedSalary = wages.reduce((sum, w) => sum + (w.calculated_salary || 0), 0)
  const totalAdvancePaid = wages.reduce((sum, w) => sum + (w.advance_paid || 0), 0)
  const totalNetPayable = wages.reduce((sum, w) => sum + (w.final_payable || 0), 0)

  return (
    <div className="page-wrapper wgs-wrapper">
      
      <header className="wgs-header">
        <div>
          <h2 className="wgs-title">Monthly Wages Summary</h2>
          <p className="wgs-subtitle">Real-time salary calculation sheet derived from daily duties and logged advances.</p>
        </div>

        <div className="wgs-month-selector" title="Select Month">
          <span className="wgs-month-input-label">Select Month:</span>
          <div className="wgs-month-input-wrap-relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="wgs-month-input"
            />
          </div>
        </div>
      </header>

      <Table
        columns={columns}
        data={wages}
        loading={loading}
        emptyMessage="No wages calculation available for this month."
      />

      {!loading && wages.length > 0 && (
        <div className="wgs-summary-panel">
          <div className="wgs-summary-card">
            <span className="wgs-summary-label">Total Employees</span>
            <span className="wgs-summary-value">{totalEmployees}</span>
          </div>
          <div className="wgs-summary-card">
            <span className="wgs-summary-label">Total Duty (Days)</span>
            <span className="wgs-summary-value">{totalDuties.toFixed(1)}</span>
          </div>
          <div className="wgs-summary-card">
            <span className="wgs-summary-label">Calculated Gross</span>
            <span className="wgs-summary-value">{formatCurrency(totalCalculatedSalary)}</span>
          </div>
          <div className="wgs-summary-card">
            <span className="wgs-summary-label">Total Advances</span>
            <span className="wgs-summary-value wgs-summary-value--danger">-{formatCurrency(totalAdvancePaid)}</span>
          </div>
          <div className="wgs-summary-card wgs-summary-card--primary">
            <span className="wgs-summary-label wgs-summary-label--primary">Grand Net Payable</span>
            <span className="wgs-summary-value wgs-summary-value--success">{formatCurrency(totalNetPayable)}</span>
          </div>
        </div>
      )}

      {/* ── SET SALARY RATE MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={salaryModal.open}
        onClose={() => setSalaryModal({ open: false, row: null })}
        title="Set Daily Salary Rate"
        size="sm"
      >
        {salaryModal.row && (
          <form onSubmit={handleSalarySave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Employee</span>
                <span style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>{salaryModal.row.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Employee Code</span>
                <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{salaryModal.row.employee_code}</span>
              </div>
            </div>

            <Input
              type="number"
              label="Basic Daily Rate (INR)"
              required
              min={0}
              step={0.01}
              value={salaryForm.basic_salary}
              onChange={(e) => setSalaryForm({ basic_salary: e.target.value })}
              placeholder="e.g. 450.00"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
              <Button
                variant="secondary"
                onClick={() => setSalaryModal({ open: false, row: null })}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" icon={<RiSaveLine />} loading={saving}>
                Save Daily Rate
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  )
}
