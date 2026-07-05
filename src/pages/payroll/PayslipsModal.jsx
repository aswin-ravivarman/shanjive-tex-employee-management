/**
 * PayslipsModal.jsx
 * -----------------
 * Modal displaying list of generated payslips for a specific payroll run.
 */

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { RiPrinterLine } from 'react-icons/ri'
import Modal from '@/components/common/Modal'
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import { getPayslipsForRun } from '@/services/payrollService'
import { formatCurrency } from '@/utils/formatters'
import './PayslipsModal.css'

export default function PayslipsModal({ isOpen, onClose, run }) {
  const [slips, setSlips] = useState([])
  const [loading, setLoading] = useState(false)

  // Load payslips when run changes
  useEffect(() => {
    if (!isOpen || !run) return

    async function loadSlips() {
      setLoading(true)
      const { data, error } = await getPayslipsForRun(run.id)
      setLoading(false)

      if (error) {
        toast.error('Failed to load payslips for this cycle.')
      } else {
        setSlips(data || [])
      }
    }

    loadSlips()
  }, [isOpen, run])

  // Simple print handler
  function handlePrintSlip(slip) {
    // Open a mock printable window representing standard commercial payslip
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${slip.employees?.full_name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 16px; margin-top: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; margin-top: 30px; gap: 15px; }
            .label { font-weight: bold; color: #666; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">SHANJIVE TEX</div>
            <div class="title">Salary Slip - Month: ${run?.month}/${run?.year}</div>
          </div>
          <div class="info-grid">
            <div><span class="label">Employee Name:</span> ${slip.employees?.full_name}</div>
            <div><span class="label">Employee Code:</span> ${slip.employees?.employee_code}</div>
            <div><span class="label">Department:</span> ${slip.employees?.departments?.name || 'Production'}</div>
            <div><span class="label">Days Present:</span> ${slip.present_days} / 26 days</div>
          </div>
          <table class="table">
            <thead>
              <tr><th>Salary Component</th><th>Amount (INR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic Salary</td><td>${formatCurrency(slip.basic_salary)}</td></tr>
              <tr><td>Allowances</td><td>${formatCurrency(slip.total_allowances)}</td></tr>
              <tr><td>Overtime Payout</td><td>${formatCurrency(slip.overtime_amount)}</td></tr>
              <tr><td>Bonus</td><td>${formatCurrency(slip.bonus_amount)}</td></tr>
              <tr style="background-color: #fafafa; font-weight: bold;">
                <td>Gross Earnings</td>
                <td>${formatCurrency(slip.gross_salary)}</td>
              </tr>
              <tr><td>Deductions (PF/Tax/Penalty)</td><td>- ${formatCurrency(slip.total_deductions)}</td></tr>
              <tr class="total" style="background-color: #f1f5f9;">
                <td>Net Take-home Salary</td>
                <td>${formatCurrency(slip.net_salary)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const columns = [
    {
      key: 'code',
      title: 'Code',
      render: (row) => <span style={{ fontWeight: 'bold' }}>{row.employees?.employee_code}</span>
    },
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span>{row.employees?.full_name}</span>
    },
    {
      key: 'gross',
      title: 'Gross Earnings',
      render: (row) => <span>{formatCurrency(row.gross_salary)}</span>
    },
    {
      key: 'deductions',
      title: 'Deductions',
      render: (row) => <span style={{ color: 'var(--color-danger)' }}>-{formatCurrency(row.total_deductions)}</span>
    },
    {
      key: 'net',
      title: 'Net Salary',
      render: (row) => <span style={{ fontWeight: 'bold', color: 'var(--color-success-dark)' }}>{formatCurrency(row.net_salary)}</span>
    },
    {
      key: 'print',
      title: 'Payslip',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={<RiPrinterLine />}
          onClick={() => handlePrintSlip(row)}
        >
          Print Slip
        </Button>
      )
    }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payslips - Cycle: ${run?.month}/${run?.year}`} size="lg">
      <div className="payslips-list-container">
        <Table
          columns={columns}
          data={slips}
          loading={loading}
          emptyMessage="No payslips generated for this cycle."
        />
      </div>
    </Modal>
  )
}
