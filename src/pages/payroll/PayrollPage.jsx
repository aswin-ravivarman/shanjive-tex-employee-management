/**
 * PayrollPage.jsx
 * ---------------
 * Full Monthly Payroll Management Page.
 * Displays processed cycles, aggregates take-home statistics, and handles
 * lock and disbursement transitions.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  RiCalculatorLine,
  RiFileList3Line,
  RiLock2Line,
  RiMoneyDollarCircleLine
} from 'react-icons/ri'
import {
  getPayrollRuns,
  lockPayrollRun,
  markPayrollPaid
} from '@/services/payrollService'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'
import { formatCurrency, formatMonthYear } from '@/utils/formatters'
import dayjs from 'dayjs'

// UI parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'

import GeneratePayrollModal from './GeneratePayrollModal'
import PayslipsModal from './PayslipsModal'

import './PayrollPage.css'

export default function PayrollPage() {
  const { hasPermission } = usePermission()
  
  // Strict check: Payroll can only be viewed/managed by Super Admins
  const isSuperAdmin = hasPermission(PERMISSIONS.PAYROLL_VIEW)
  const canManage    = hasPermission(PERMISSIONS.PAYROLL_MANAGE)

  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog configurations
  const [isProcessOpen, setIsProcessOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState(null)
  const [isPayslipsOpen, setIsPayslipsOpen] = useState(false)

  // Confirm states
  const [confirmTarget, setConfirmTarget] = useState(null) // { run, action: 'lock' | 'pay' }
  const [confirming, setConfirming] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // LOAD PAYROLL SUMMARY CYCLES
  // ─────────────────────────────────────────────────────────────
  const loadRuns = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getPayrollRuns()
    if (error) {
      toast.error('Failed to load payroll cycles summary.')
    } else {
      setRuns(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      loadRuns()
    }
  }, [loadRuns, isSuperAdmin])

  // ─────────────────────────────────────────────────────────────
  // TRANSITION ACTIONS
  // ─────────────────────────────────────────────────────────────
  function handleLockClick(run) {
    setConfirmTarget({ run, action: 'lock' })
  }

  function handlePayClick(run) {
    setConfirmTarget({ run, action: 'pay' })
  }

  async function handleConfirmAction() {
    if (!confirmTarget) return
    const { run, action } = confirmTarget

    setConfirming(true)
    let error
    if (action === 'lock') {
      const res = await lockPayrollRun(run.id)
      error = res.error
    } else {
      const res = await markPayrollPaid(run.id)
      error = res.error
    }
    setConfirming(false)
    setConfirmTarget(null)

    if (error) {
      toast.error(`Action failed: ${error.message}`)
    } else {
      toast.success(action === 'lock' ? 'Payroll run locked.' : 'Salaries disbursed successfully.')
      loadRuns()
    }
  }

  function handleViewPayslips(run) {
    setSelectedRun(run)
    setIsPayslipsOpen(true)
  }

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'period',
      title: 'Payroll Month',
      render: (row) => {
        if (row.start_date && row.end_date) {
          const start = dayjs(row.start_date)
          const end = dayjs(row.end_date)
          const isFullMonth = start.date() === 1 && end.date() === start.endOf('month').date()
          if (isFullMonth) {
            return <span className="pay-table-period">{start.format('MMMM YYYY')}</span>
          }
          return (
            <span className="pay-table-period" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
              {start.format('DD MMM YYYY')} - {end.format('DD MMM YYYY')}
            </span>
          )
        }
        return (
          <span className="pay-table-period">{formatMonthYear(row.month, row.year)}</span>
        )
      }
    },
    {
      key: 'employees_paid',
      title: 'Employees',
      render: (row) => <span>{row.employees_paid} paid</span>
    },
    {
      key: 'total_gross',
      title: 'Total Gross Pay',
      render: (row) => <span>{formatCurrency(row.total_gross)}</span>
    },
    {
      key: 'total_deductions',
      title: 'Deductions',
      render: (row) => <span style={{ color: 'var(--color-danger)' }}>-{formatCurrency(row.total_deductions)}</span>
    },
    {
      key: 'total_net',
      title: 'Total Net Payout',
      render: (row) => <span style={{ fontWeight: 'bold' }}>{formatCurrency(row.total_net)}</span>
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge status={row.status} />
    },
    {
      key: 'actions',
      title: 'Salary Actions',
      align: 'right',
      render: (row) => (
        <div className="pay-table-actions">
          <Button
            variant="outline"
            size="sm"
            icon={<RiFileList3Line />}
            onClick={() => handleViewPayslips(row)}
          >
            Payslips
          </Button>

          {canManage && row.status === 'processed' && (
            <Button
              variant="outline"
              size="sm"
              icon={<RiLock2Line />}
              onClick={() => handleLockClick(row)}
            >
              Lock Run
            </Button>
          )}

          {canManage && row.status === 'locked' && (
            <Button
              variant="primary"
              size="sm"
              icon={<RiMoneyDollarCircleLine />}
              onClick={() => handlePayClick(row)}
            >
              Disburse
            </Button>
          )}
        </div>
      )
    }
  ]

  // If not super admin, show restricted panel
  if (!isSuperAdmin) {
    return (
      <div className="page-wrapper pay-wrapper">
        <div className="pay-restricted-box">
          <RiLock2Line className="pay-restricted-icon" />
          <h2 className="pay-restricted-title">Access Restricted</h2>
          <p className="pay-restricted-text">
            Payroll management contains sensitive financial salary calculations and is restricted to the Super Admin role only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper pay-wrapper">
      
      {/* ── HEADER ACTIONS strip ────────────────────────────────── */}
      <header className="pay-header">
        <div>
          <h2 className="pay-title">Payroll Cycles</h2>
          <p className="pay-subtitle">Process monthly payouts, check component calculations, and disburse salaries.</p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            icon={<RiCalculatorLine />}
            onClick={() => setIsProcessOpen(true)}
          >
            Process Payroll
          </Button>
        )}
      </header>

      {/* ── TABLE VIEW ─────────────────────────────────────────── */}
      <Table
        columns={columns}
        data={runs}
        loading={loading}
        emptyMessage="No payroll cycles have been processed yet."
      />

      {/* ── PROCESS RUN MODAL ──────────────────────────────────── */}
      <GeneratePayrollModal
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        onSaveSuccess={loadRuns}
      />

      {/* ── PAYSLIPS GRID MODAL ────────────────────────────────── */}
      <PayslipsModal
        isOpen={isPayslipsOpen}
        onClose={() => setIsPayslipsOpen(false)}
        run={selectedRun}
      />

      {/* ── STATUS CONFORMATION DIALOGS ────────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        title={confirmTarget?.action === 'lock' ? 'Lock Payroll Run' : 'Disburse Monthly Salaries'}
        message={
          confirmTarget?.action === 'lock'
            ? 'Are you sure you want to lock this payroll run? Locking will prevent any adjustments to this month\'s payslips, preparing them for disbursement.'
            : 'Are you sure you want to mark these salaries as paid? This represents the actual financial disbursement of take-home salaries to employees.'
        }
        confirmText={confirmTarget?.action === 'lock' ? 'Lock Payroll' : 'Mark as Paid'}
        loading={confirming}
        type={confirmTarget?.action === 'lock' ? 'warning' : 'info'}
      />

    </div>
  )
}
