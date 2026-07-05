/**
 * AttendancePage.jsx
 * ------------------
 * Full daily attendance marking page.
 * Displays list of active employees, supports marking status, and shift attendance.
 * Incorporates a real-time Monthly Wages summary calculation card below the marker grid.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  RiCalendarLine,
  RiCheckDoubleLine,
  RiSaveLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiInformationLine
} from 'react-icons/ri'
import dayjs from 'dayjs'
import { getAttendanceForDate, saveAttendance, getShiftsWithValues } from '@/services/attendanceService'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'

// UI parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

import './AttendancePage.css'
import './DutyBadge.css'

export default function AttendancePage() {
  const { hasPermission } = usePermission()
  const canManage = hasPermission(PERMISSIONS.ATTENDANCE_MANAGE)

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [records, setRecords] = useState([])
  const [shifts, setShifts] = useState([]) // Loaded shift definitions
  const [loading, setLoading] = useState(true)
  const [savingRowId, setSavingRowId] = useState(null)
  const [savingAll, setSavingAll] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // LOAD SHIFTS METADATA
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchShifts() {
      const { data } = await getShiftsWithValues()
      if (data) {
        setShifts(data.map(s => ({ value: s.id, id: s.id, label: s.name, name: s.name, shift_value: s.shift_value })))
      }
    }
    fetchShifts()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // LOAD DAILY ATTENDANCE RECORDS
  // ─────────────────────────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getAttendanceForDate(date)
    if (error) {
      toast.error('Failed to load attendance records.')
    } else {
      setRecords(data || [])
    }
    setLoading(false)
  }, [date])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Date selectors
  function handlePrevDay() {
    setDate(prev => dayjs(prev).subtract(1, 'day').format('YYYY-MM-DD'))
  }

  function handleNextDay() {
    // Prevent navigating to future dates
    const next = dayjs(date).add(1, 'day')
    if (next.isAfter(dayjs(), 'day')) {
      toast.warn('Cannot mark attendance for future dates.')
      return
    }
    setDate(next.format('YYYY-MM-DD'))
  }

  // ─────────────────────────────────────────────────────────────
  // FORM FIELD CHANGERS
  // ─────────────────────────────────────────────────────────────
  function handleStatusChange(empId, status) {
    setRecords(prev =>
      prev.map(rec => {
        if (rec.employee_id !== empId) return rec
        return {
          ...rec,
          status,
          // If absent/leave, clear the shift
          shift_id: status === 'present' ? rec.shift_id || (shifts[0]?.id || null) : null
        }
      })
    )
  }

  function handleShiftChange(empId, shiftId) {
    setRecords(prev =>
      prev.map(rec => {
        if (rec.employee_id !== empId) return rec
        return {
          ...rec,
          shift_id: shiftId
        }
      })
    )
  }

  function handleRemarksChange(empId, remarks) {
    setRecords(prev =>
      prev.map(rec => {
        if (rec.employee_id !== empId) return rec
        return { ...rec, remarks }
      })
    )
  }

  // Helper to calculate Duty multiplier — reads shift_value directly from DB column
  function getDutyMultiplier(status, shiftId, shiftsList) {
    if (status !== 'present') return 0
    const matchedShift = shiftsList.find(s => s.id === shiftId || s.value === shiftId)
    return Number(matchedShift?.shift_value ?? 1.0)
  }

  // ─────────────────────────────────────────────────────────────
  // SAVE FUNCTIONS
  // ─────────────────────────────────────────────────────────────
  async function handleSaveRow(record) {
    setSavingRowId(record.employee_id)
    const { data, error } = await saveAttendance(record)
    setSavingRowId(null)

    if (error) {
      toast.error(`Failed to save attendance for ${record.employee.full_name}: ${error.message}`)
    } else {
      toast.success(`Saved attendance for ${record.employee.full_name}`)
      // Update local row record ID if it was a new draft
      setRecords(prev =>
        prev.map(r => (r.employee_id === record.employee_id ? { ...r, id: data.id } : r))
      )
    }
  }

  async function handleSaveAll() {
    setSavingAll(true)
    let succeeded = 0
    let failed = 0

    // Loop through all records and save them sequentially
    for (const rec of records) {
      const { data, error } = await saveAttendance(rec)
      if (error) {
        failed++
      } else {
        succeeded++
        // Update local list
        setRecords(prev =>
          prev.map(r => (r.employee_id === rec.employee_id ? { ...r, id: data.id } : r))
        )
      }
    }

    setSavingAll(false)

    if (failed > 0) {
      toast.warning(`Saved ${succeeded} records, but ${failed} failed. Please check rows.`)
    } else {
      toast.success('Successfully saved all attendance records.')
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'employee_code',
      title: 'Code',
      render: (row) => <span className="att-table-code">{row.employee.employee_code}</span>,
    },
    {
      key: 'full_name',
      title: 'Employee Name',
      render: (row) => (
        <span className="att-table-name">{row.employee.full_name}</span>
      ),
    },
    {
      key: 'status',
      title: 'Duty Status',
      render: (row) => {
        const options = [
          { value: 'present',  label: 'Present' },
          { value: 'absent',   label: 'Absent' },
          { value: 'leave',    label: 'On Leave' }
        ]
        return (
          <Input
            type="select"
            value={row.status}
            onChange={(e) => handleStatusChange(row.employee_id, e.target.value)}
            options={options}
            disabled={!canManage}
            className="att-status-select"
          />
        )
      },
    },
    {
      key: 'shift_id',
      title: 'Working Shift',
      render: (row) => {
        const isPresent = row.status === 'present'
        const shiftOpts = [
          { value: '', label: 'Select Shift' },
          { value: 'shift_1', label: 'Shift 1' },
          { value: 'shift_2', label: 'Shift 2' },
          { value: 'shift_3', label: 'Shift 3' }
        ]
        const options = shifts.length > 0 ? shifts : shiftOpts

        return (
          <Input
            type="select"
            value={row.shift_id || ''}
            onChange={(e) => handleShiftChange(row.employee_id, e.target.value)}
            disabled={!canManage || !isPresent}
            options={options}
            className="att-status-select"
          />
        )
      },
    },
    {
      key: 'duty',
      title: 'Duty Count',
      render: (row) => {
        const multiplier = getDutyMultiplier(row.status, row.shift_id, shifts)
        return (
          <span className={`att-duty-badge ${multiplier > 0 ? 'att-duty-badge--present' : 'att-duty-badge--absent'}`}>
            {multiplier}
          </span>
        )
      },
    },
    {
      key: 'remarks',
      title: 'Remarks / Notes',
      render: (row) => (
        <Input
          type="text"
          value={row.remarks || ''}
          placeholder="e.g. Worked half day"
          onChange={(e) => handleRemarksChange(row.employee_id, e.target.value)}
          disabled={!canManage}
          className="att-remarks-input"
        />
      ),
    },
    {
      key: 'action',
      title: 'Save',
      align: 'right',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleSaveRow(row)}
          loading={savingRowId === row.employee_id}
          disabled={!canManage || savingAll}
          icon={<RiSaveLine />}
        >
          Save
        </Button>
      ),
    },
  ]

  const visibleColumns = canManage ? columns : columns.slice(0, -1)

  // ─────────────────────────────────────────────────────────────
  // WAGES SUMMARY COLUMNS DEFINITION
  // ─────────────────────────────────────────────────────────────
  const wagesColumns = [
    {
      key: 'employee_code',
      title: 'Code',
      render: (row) => <span className="att-table-code">{row.employee_code}</span>
    },
    {
      key: 'full_name',
      title: 'Employee Name',
      render: (row) => <span className="att-table-name">{row.full_name}</span>
    },
    {
      key: 'total_duty',
      title: 'Total Duty (Days)',
      render: (row) => <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{row.total_duty}</span>
    },
    {
      key: 'salary_fixed',
      title: 'Salary Fixed (Per Day)',
      render: (row) => <span>₹{row.salary_fixed}</span>
    },
    {
      key: 'calculated_salary',
      title: 'Calculated Salary',
      render: (row) => <span style={{ fontWeight: 'bold' }}>₹{row.calculated_salary}</span>
    },
    {
      key: 'advance_paid',
      title: 'Advance Paid',
      render: (row) => <span style={{ color: 'var(--color-danger)' }}>- ₹{row.advance_paid}</span>
    },
    {
      key: 'final_payable',
      title: 'Final Payable',
      render: (row) => (
        <span style={{ fontWeight: 'bold', color: 'var(--color-success-dark)', fontSize: 'var(--text-md)' }}>
          ₹{row.final_payable}
        </span>
      )
    }
  ]

  return (
    <div className="page-wrapper att-wrapper">
      
      {/* ── HEADER NAVIGATION STRIP ────────────────────────────── */}
      <header className="att-header">
        <div className="att-title-block">
          <h2 className="att-title">Daily Attendance</h2>
          <p className="att-subtitle">Select a date to check schedules and log shift attendance.</p>
        </div>
        
        {/* Date Selector Navigation */}
        <div className="att-date-navigator">
          <button className="att-date-arrow" onClick={handlePrevDay} aria-label="Previous day">
            <RiArrowLeftSLine />
          </button>
          
          <div className="att-date-input-wrap" title="Select Date">
            <span className="att-date-input-label">Attendance Date:</span>
            <div className="att-date-input-wrap-relative">
              <input
                type="date"
                value={date}
                max={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => setDate(e.target.value)}
                className="att-date-input"
              />
            </div>
          </div>
          
          <button
            className="att-date-arrow"
            onClick={handleNextDay}
            disabled={dayjs(date).isSame(dayjs(), 'day')}
            aria-label="Next day"
          >
            <RiArrowRightSLine />
          </button>
        </div>
      </header>

      {/* ── DRAFT NOTE ─────────────────────────────────────────── */}
      {canManage && (
        <div className="att-info-banner">
          <RiInformationLine className="att-info-icon" />
          <p className="att-info-text">
            Mark daily status and select the shift worked. Duty counts: {shifts.length > 0 ? shifts.map((s, idx) => (
              <span key={s.id}>
                <strong>{s.name} = {s.shift_value}</strong>{idx < shifts.length - 1 ? ', ' : ' '}
              </span>
            )) : 'Loading shifts...'} — aggregated for monthly salary computations.
          </p>
        </div>
      )}

      {/* ── DAILY TABLE VIEW ─────────────────────────────────────────── */}
      <Table
        columns={visibleColumns}
        data={records}
        loading={loading}
        emptyMessage="No active employees found to log attendance for."
      />

      {/* ── BULK SAVE FOOTER ACTIONS ────────────────────────────── */}
      {canManage && records.length > 0 && !loading && (
        <div className="att-footer-actions">
          <Button
            variant="primary"
            icon={<RiCheckDoubleLine />}
            onClick={handleSaveAll}
            loading={savingAll}
          >
            Save All Records
          </Button>
        </div>
      )}

    </div>
  )
}
