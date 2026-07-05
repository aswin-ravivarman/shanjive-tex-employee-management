/**
 * AdvancesPage.jsx
 * ----------------
 * Log and record salary advances paid to employees.
 * Tracks partial/full settlements via advance_settlements table.
 * Outstanding balance = total advance − sum of all settlements.
 */
import React, { useState, useEffect, useCallback, Fragment } from 'react'
import { toast } from 'react-toastify'
import {
  RiHandCoinLine,
  RiAddLine,
  RiMoneyDollarCircleLine,
  RiHistoryLine,
  RiArrowDropDownLine,
  RiArrowDropUpLine
} from 'react-icons/ri'
import { getAdvances, recordAdvance, settleAdvance } from '@/services/advancesService'
import { logActivity } from '@/services/activityLogService'
import { getActiveEmployeesList } from '@/services/leaveService'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { validateRequired, validatePositiveNumber } from '@/utils/validators'
import { usePermission } from '@/hooks/usePermission'

// UI Parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'

import './AdvancesPage.css'

export default function AdvancesPage() {
  const { hasPermission } = usePermission()
  const canManage = hasPermission('advances.manage')

  const [advances, setAdvances] = useState([])
  const [loading, setLoading] = useState(true)

  // Record Advance modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [employees, setEmployees] = useState([])
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ employee_id: '', amount: '', remarks: '' })
  const [errors, setErrors] = useState({})

  // Settle Advance modal state
  const [settleModal, setSettleModal] = useState({ open: false, advance: null })
  const [settleForm, setSettleForm] = useState({ settled_amount: '', remarks: '' })
  const [settleErrors, setSettleErrors] = useState({})
  const [settling, setSettling] = useState(false)

  // Expanded history rows
  const [expandedIds, setExpandedIds] = useState(new Set())

  // ─────────────────────────────────────────────────────────────
  // LOAD ADVANCES + SETTLEMENT AGGREGATES
  // ─────────────────────────────────────────────────────────────
  const loadAdvances = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getAdvances()
      if (error) throw error
      setAdvances(data || [])
    } catch (err) {
      toast.error('Failed to load advances: ' + err.message)
      console.error('[AdvancesPage] loadAdvances error:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAdvances()
  }, [loadAdvances])

  // Load employee dropdown on open
  useEffect(() => {
    if (!isModalOpen) return
    getActiveEmployeesList().then(({ data }) => {
      if (data) {
        setEmployees([
          { value: '', label: 'Select Employee' },
          ...data.map(e => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))
        ])
      }
    })
    setFormData({ employee_id: '', amount: '', remarks: '' })
    setErrors({})
  }, [isModalOpen])

  // Reset settle form on open
  useEffect(() => {
    if (!settleModal.open) return
    setSettleForm({ settled_amount: '', remarks: '' })
    setSettleErrors({})
  }, [settleModal.open])

  // ─────────────────────────────────────────────────────────────
  // RECORD ADVANCE FORM
  // ─────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const err = {}
    const empErr = validateRequired(formData.employee_id, 'Employee')
    if (empErr) err.employee_id = empErr
    const amtErr = validatePositiveNumber(formData.amount, 'Advance Amount')
    if (amtErr) err.amount = amtErr
    if (Number(formData.amount) < 0) err.amount = 'Advance amount cannot be negative'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const { error } = await recordAdvance(formData.employee_id, Number(formData.amount))
      if (error) throw error

      await logActivity(
        'advances',
        'create',
        `Recorded advance of ₹${formData.amount} for employee ID: ${formData.employee_id}`
      )

      toast.success('Advance payment logged successfully.')
      setIsModalOpen(false)
      loadAdvances()
    } catch (err) {
      toast.error(err.message || 'Failed to record advance.')
    }
    setSaving(false)
  }

  // ─────────────────────────────────────────────────────────────
  // SETTLE ADVANCE FORM
  // ─────────────────────────────────────────────────────────────
  function handleSettleChange(e) {
    const { name, value } = e.target
    setSettleForm(prev => ({ ...prev, [name]: value }))
    if (settleErrors[name]) setSettleErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validateSettle() {
    const err = {}
    const adv = settleModal.advance
    const amt = Number(settleForm.settled_amount)

    if (!settleForm.settled_amount || isNaN(amt) || amt <= 0) {
      err.settled_amount = 'Enter a valid positive amount'
    } else if (amt > adv?.outstanding) {
      err.settled_amount = `Cannot exceed outstanding balance of ${formatCurrency(adv.outstanding)}`
    }

    setSettleErrors(err)
    return Object.keys(err).length === 0
  }

  async function handleSettleSubmit(e) {
    e.preventDefault()
    if (!validateSettle()) return

    setSettling(true)
    try {
      const { error } = await settleAdvance(
        settleModal.advance.id,
        Number(settleForm.settled_amount),
        settleForm.remarks || null
      )
      if (error) throw error

      const resultingOutstanding = settleModal.advance.outstanding - Number(settleForm.settled_amount);
      await logActivity(
        'advances',
        'settle',
        `Settled ₹${settleForm.settled_amount} for advance component ${settleModal.advance.id}. Resulting outstanding: ₹${resultingOutstanding}`
      )

      toast.success(`Settlement of ${formatCurrency(settleForm.settled_amount)} recorded.`)
      setSettleModal({ open: false, advance: null })
      loadAdvances()
    } catch (err) {
      toast.error('Failed to record settlement: ' + err.message)
    }
    setSettling(false)
  }

  // ─────────────────────────────────────────────────────────────
  // EXPAND HISTORY TOGGLE
  // ─────────────────────────────────────────────────────────────
  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY STATS
  // ─────────────────────────────────────────────────────────────
  const totalAdvance = advances.reduce((s, a) => s + a.amount, 0)
  const totalSettled = advances.reduce((s, a) => s + a.total_settled, 0)
  const totalOutstanding = advances.reduce((s, a) => s + a.outstanding, 0)

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name',
      title: 'Employee Name',
      render: (row) => <span className="adv-table-name">{row.employees?.full_name}</span>
    },
    {
      key: 'amount',
      title: 'Total Advance',
      render: (row) => <span className="adv-table-amount">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'total_settled',
      title: 'Total Settled',
      render: (row) => (
        <span style={{ color: 'var(--color-success-dark)', fontWeight: 'var(--font-semibold)' }}>
          {row.total_settled > 0 ? formatCurrency(row.total_settled) : '—'}
        </span>
      )
    },
    {
      key: 'outstanding',
      title: 'Outstanding',
      render: (row) => (
        <span
          className={`adv-outstanding ${row.outstanding > 0 ? 'adv-outstanding--due' : 'adv-outstanding--clear'}`}
        >
          {row.outstanding > 0 ? formatCurrency(row.outstanding) : 'Cleared'}
        </span>
      )
    },
    {
      key: 'date',
      title: 'Date Logged',
      render: (row) => <span>{formatDate(row.created_at)}</span>
    },
    {
      key: 'history',
      title: 'History',
      render: (row) => row.settlements.length > 0 ? (
        <button className="adv-history-toggle" onClick={() => toggleExpand(row.id)}>
          {expandedIds.has(row.id)
            ? <><RiArrowDropUpLine /> Hide ({row.settlements.length})</>
            : <><RiArrowDropDownLine /> View ({row.settlements.length})</>}
        </button>
      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>None</span>
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
            icon={<RiMoneyDollarCircleLine />}
            disabled={row.outstanding <= 0}
            onClick={() => setSettleModal({ open: true, advance: row })}
          >
            Settle
          </Button>
        ) : null
      )
    }
  ]

  return (
    <div className="page-wrapper adv-wrapper">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="adv-header">
        <div>
          <h2 className="adv-title">Advance Payout Logs</h2>
          <p className="adv-subtitle">Record advances and track partial/full settlements. Outstanding shown in real-time.</p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            icon={<RiAddLine />}
            onClick={() => setIsModalOpen(true)}
          >
            Record Advance
          </Button>
        )}
      </header>

      {/* ── SUMMARY CARDS ──────────────────────────────────────────── */}
      {!loading && advances.length > 0 && (
        <div className="adv-summary-row">
          <div className="adv-summary-card">
            <span className="adv-summary-label">Total Advance</span>
            <span className="adv-summary-value">{formatCurrency(totalAdvance)}</span>
          </div>
          <div className="adv-summary-card adv-summary-card--settled">
            <span className="adv-summary-label">Total Settled</span>
            <span className="adv-summary-value adv-summary-value--settled">{formatCurrency(totalSettled)}</span>
          </div>
          <div className="adv-summary-card adv-summary-card--outstanding">
            <span className="adv-summary-label">Outstanding</span>
            <span className="adv-summary-value adv-summary-value--outstanding">{formatCurrency(totalOutstanding)}</span>
          </div>
        </div>
      )}

      {/* ── MAIN TABLE ─────────────────────────────────────────────── */}
      <div className="adv-table-wrapper">
        {/* We render rows manually to inject expandable history rows */}
        {loading ? (
          <Table columns={columns} data={[]} loading={true} />
        ) : advances.length === 0 ? (
          <Table columns={columns} data={[]} loading={false} emptyMessage="No advances recorded yet." />
        ) : (
          <div className="table-card">
            <div className="table-scroll-container">
              <table className="table-element">
                <thead className="table-thead">
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} className="table-th" style={{ textAlign: col.align || 'left' }}>
                        {col.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="table-tbody">
                  {advances.map((row, rIdx) => (
                    <Fragment key={row.id || rIdx}>
                      <tr className="table-row">
                        {columns.map(col => (
                          <td key={`${row.id}-${col.key}`} className="table-td" style={{ textAlign: col.align || 'left' }}>
                            {col.render ? col.render(row) : row[col.key]}
                          </td>
                        ))}
                      </tr>
                      {/* Expandable settlement history */}
                      {expandedIds.has(row.id) && (
                        <tr key={`history-${row.id}`} className="adv-history-row">
                          <td colSpan={columns.length} className="adv-history-cell">
                            <div className="adv-history-panel">
                              <p className="adv-history-title">
                                <RiHistoryLine /> Settlement History
                              </p>
                              <table className="adv-history-table">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Amount Settled</th>
                                    <th>Remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.settlements.map(s => (
                                    <tr key={s.id}>
                                      <td>{formatDate(s.settlement_date)}</td>
                                      <td style={{ color: 'var(--color-success-dark)', fontWeight: 'bold' }}>
                                        {formatCurrency(s.settled_amount)}
                                      </td>
                                      <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {s.remarks || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── RECORD ADVANCE MODAL ───────────────────────────────────── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Salary Advance" size="sm">
        <form onSubmit={handleSubmit} className="adv-form">

          <Input
            type="select"
            label="Employee"
            name="employee_id"
            required
            value={formData.employee_id}
            onChange={handleChange}
            options={employees}
            error={errors.employee_id}
          />

          <Input
            type="number"
            label="Advance Amount (INR)"
            name="amount"
            required
            min={0}
            value={formData.amount}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || Number(val) >= 0) handleChange(e)
            }}
            placeholder="e.g. 1000"
            error={errors.amount}
          />

          <div className="adv-modal-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Record Advance
            </Button>
          </div>

        </form>
      </Modal>

      {/* ── SETTLE ADVANCE MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={settleModal.open}
        onClose={() => setSettleModal({ open: false, advance: null })}
        title="Record Settlement"
        size="sm"
      >
        {settleModal.advance && (
          <form onSubmit={handleSettleSubmit} className="adv-form">

            {/* Context: employee + outstanding */}
            <div className="adv-settle-context">
              <div className="adv-settle-context-row">
                <span className="adv-settle-context-label">Employee</span>
                <span className="adv-settle-context-value">{settleModal.advance.employees?.full_name}</span>
              </div>
              <div className="adv-settle-context-row">
                <span className="adv-settle-context-label">Total Advance</span>
                <span className="adv-settle-context-value">{formatCurrency(settleModal.advance.amount)}</span>
              </div>
              <div className="adv-settle-context-row">
                <span className="adv-settle-context-label">Already Settled</span>
                <span className="adv-settle-context-value" style={{ color: 'var(--color-success-dark)' }}>
                  {formatCurrency(settleModal.advance.total_settled)}
                </span>
              </div>
              <div className="adv-settle-context-row adv-settle-context-row--highlight">
                <span className="adv-settle-context-label">Outstanding</span>
                <span className="adv-settle-context-value adv-settle-outstanding">
                  {formatCurrency(settleModal.advance.outstanding)}
                </span>
              </div>
            </div>

            <Input
              type="number"
              label="Settlement Amount (INR)"
              name="settled_amount"
              required
              min={0.01}
              step={0.01}
              value={settleForm.settled_amount}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || Number(val) >= 0) handleSettleChange(e)
              }}
              placeholder={`Max: ${formatCurrency(settleModal.advance.outstanding)}`}
              error={settleErrors.settled_amount}
            />

            <Input
              type="textarea"
              label="Remarks (optional)"
              name="remarks"
              value={settleForm.remarks}
              onChange={handleSettleChange}
              placeholder="e.g. Settled from July wages"
              rows={2}
            />

            <div className="adv-modal-actions">
              <Button
                variant="secondary"
                onClick={() => setSettleModal({ open: false, advance: null })}
                disabled={settling}
              >
                Cancel
              </Button>
              <Button type="submit" loading={settling}>
                Confirm Settlement
              </Button>
            </div>

          </form>
        )}
      </Modal>

    </div>
  )
}
