/**
 * LeaveFormModal.jsx
 * -----------------
 * Form Modal to record a new employee leave entry.
 * Dynamically queries and displays the selected employee's current leave balance.
 */

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import {
  getActiveEmployeesList,
  getLeaveTypes,
  getEmployeeLeaveBalances,
  createLeaveRecord
} from '@/services/leaveService'
import { validateRequired } from '@/utils/validators'
import './LeaveFormModal.css'

const INITIAL_FORM_STATE = {
  employee_id: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
  total_days: 1
}

export default function LeaveFormModal({ isOpen, onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Options lists
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [balances, setBalances] = useState([]) // Loaded balances for the selected employee
  const [selectedBalance, setSelectedBalance] = useState(null)

  // Load employee list and leave types on open
  useEffect(() => {
    if (!isOpen) return

    async function loadMetadata() {
      const [empRes, typeRes] = await Promise.all([
        getActiveEmployeesList(),
        getLeaveTypes()
      ])

      const empOpts = (empRes.data || []).map(e => ({
        value: e.id,
        label: `${e.full_name} (${e.employee_code})`
      }))
      const typeOpts = (typeRes.data || []).map(t => ({
        value: t.id,
        label: `${t.name} ${t.is_paid ? '(Paid)' : '(Unpaid)'}`
      }))

      setEmployees([{ value: '', label: 'Select Employee' }, ...empOpts])
      setLeaveTypes([{ value: '', label: 'Select Leave Type' }, ...typeOpts])
      setFormData(INITIAL_FORM_STATE)
      setBalances([])
      setSelectedBalance(null)
      setErrors({})
    }

    loadMetadata()
  }, [isOpen])

  // Load selected employee's balances when employee_id changes
  useEffect(() => {
    if (!formData.employee_id) {
      setBalances([])
      setSelectedBalance(null)
      return
    }

    async function loadBalances() {
      const { data } = await getEmployeeLeaveBalances(formData.employee_id)
      if (data) setBalances(data)
    }

    loadBalances()
  }, [formData.employee_id])

  // Map selected leave type to show balance
  useEffect(() => {
    if (!formData.leave_type_id || !balances.length) {
      setSelectedBalance(null)
      return
    }
    const match = balances.find(b => b.leave_types?.id === formData.leave_type_id)
    setSelectedBalance(match || null)
  }, [formData.leave_type_id, balances])

  // Auto-calculate total days when start or end date changes
  useEffect(() => {
    if (!formData.start_date || !formData.end_date) return

    const start = dayjs(formData.start_date)
    const end = dayjs(formData.end_date)

    if (end.isBefore(start)) {
      setFormData(prev => ({ ...prev, total_days: 0 }))
      return
    }

    // Inclusion calculation: (end - start) + 1 day
    const days = end.diff(start, 'day') + 1
    setFormData(prev => ({ ...prev, total_days: days }))
  }, [formData.start_date, formData.end_date])

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function validate() {
    const err = {}

    const empErr = validateRequired(formData.employee_id, 'Employee')
    if (empErr) err.employee_id = empErr

    const typeErr = validateRequired(formData.leave_type_id, 'Leave Type')
    if (typeErr) err.leave_type_id = typeErr

    const startErr = validateRequired(formData.start_date, 'Start Date')
    if (startErr) err.start_date = startErr

    const endErr = validateRequired(formData.end_date, 'End Date')
    if (endErr) err.end_date = endErr

    if (formData.start_date && formData.end_date) {
      const start = dayjs(formData.start_date)
      const end = dayjs(formData.end_date)
      if (end.isBefore(start)) {
        err.end_date = 'End date cannot be before start date'
      }
    }

    setErrors(err)
    return Object.keys(err).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const { error } = await createLeaveRecord(formData)
    setSaving(false)

    if (error) {
      toast.error(`Failed to record leave: ${error.message}`)
      return
    }

    toast.success('Leave recorded successfully.')
    onSaveSuccess()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Leave Entry" size="md">
      <form className="leave-form" onSubmit={handleSubmit} noValidate>
        
        {/* Employee selector */}
        <Input
          type="select"
          label="Employee Name"
          name="employee_id"
          required
          value={formData.employee_id}
          onChange={handleChange}
          options={employees}
          error={errors.employee_id}
        />

        {/* Leave Type selector */}
        <Input
          type="select"
          label="Leave Type"
          name="leave_type_id"
          required
          value={formData.leave_type_id}
          onChange={handleChange}
          options={leaveTypes}
          error={errors.leave_type_id}
          disabled={!formData.employee_id}
        />

        {/* Dynamic Balance indicator */}
        {formData.leave_type_id && (
          <div className="leave-balance-banner">
            <span className="leave-balance-title">Employee Leave Balance:</span>
            {selectedBalance ? (
              <span className="leave-balance-value">
                Used: <strong className="leave-balance-strong">{selectedBalance.used_days}</strong> /{' '}
                Allocated: <strong className="leave-balance-strong">{selectedBalance.allocated_days}</strong> days
              </span>
            ) : (
              <span className="leave-balance-value leave-balance-value--none">
                No balance allocation found for this type.
              </span>
            )}
          </div>
        )}

        {/* Dates row */}
        <div className="leave-form-row">
          <Input
            type="date"
            label="Start Date"
            name="start_date"
            required
            value={formData.start_date}
            onChange={handleChange}
            error={errors.start_date}
          />

          <Input
            type="date"
            label="End Date"
            name="end_date"
            required
            value={formData.end_date}
            onChange={handleChange}
            error={errors.end_date}
          />
        </div>

        {/* Calculated Days and Reason */}
        <div className="leave-form-row-summary">
          <span className="leave-summary-days">
            Calculated Duration: <strong>{formData.total_days}</strong> {formData.total_days === 1 ? 'day' : 'days'}
          </span>
        </div>

        <Input
          type="textarea"
          label="Reason for Leave"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          placeholder="e.g. Family medical emergency"
        />

        {/* Actions footer */}
        <div className="leave-form-actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Record Leave
          </Button>
        </div>

      </form>
    </Modal>
  )
}
