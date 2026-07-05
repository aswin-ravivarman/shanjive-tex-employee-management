/**
 * LeavePage.jsx
 * -------------
 * Full leave history listing page.
 * Displays past recorded leaves, status, duration and filters.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { RiCalendarEventLine, RiFilterLine } from 'react-icons/ri'
import { getLeaveRecords, getLeaveTypes } from '@/services/leaveService'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

// UI parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import SearchBar from '@/components/common/SearchBar'
import Input from '@/components/common/Input'

import LeaveFormModal from './LeaveFormModal'
import './LeavePage.css'

export default function LeavePage() {
  const { hasPermission } = usePermission()
  const canManage = hasPermission(PERMISSIONS.LEAVE_MANAGE)

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [search, setSearch] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  
  // Metadata options
  const [leaveTypes, setLeaveTypes] = useState([])

  const pagination = usePagination({ defaultPageSize: 10 })
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Fetch metadata types on mount
  useEffect(() => {
    async function loadMetadata() {
      const { data } = await getLeaveTypes()
      if (data) {
        setLeaveTypes([
          { value: '', label: 'All Leave Types' },
          ...data.map(t => ({ value: t.id, label: t.name }))
        ])
      }
    }
    loadMetadata()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // LOAD LEAVE RECORDS
  // ─────────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getLeaveRecords({
      search: debouncedSearch,
      leaveTypeId,
      rangeFrom: pagination.rangeFrom,
      rangeTo: pagination.rangeTo
    })

    if (error) {
      toast.error('Failed to load leave records.')
    } else {
      setRecords(data || [])
      pagination.setTotal(count)
    }
    setLoading(false)
  }, [debouncedSearch, leaveTypeId, pagination.rangeFrom, pagination.rangeTo])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // Reset pagination page to 1 when filters change
  useEffect(() => {
    pagination.reset()
  }, [debouncedSearch, leaveTypeId])

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'employee_code',
      title: 'Code',
      render: (row) => <span className="leave-table-code">{row.employees?.employee_code}</span>
    },
    {
      key: 'full_name',
      title: 'Employee Name',
      render: (row) => (
        <div>
          <div className="leave-table-name">{row.employees?.full_name}</div>
          <div className="leave-table-dept">{row.employees?.departments?.name}</div>
        </div>
      )
    },
    {
      key: 'leave_type',
      title: 'Leave Type',
      render: (row) => (
        <span className="leave-table-type">
          {row.leave_types?.name}
          <span className="leave-table-paid-indicator">
            ({row.leave_types?.is_paid ? 'Paid' : 'Unpaid'})
          </span>
        </span>
      )
    },
    {
      key: 'start_date',
      title: 'Start Date',
      render: (row) => <span>{formatDate(row.start_date)}</span>
    },
    {
      key: 'end_date',
      title: 'End Date',
      render: (row) => <span>{formatDate(row.end_date)}</span>
    },
    {
      key: 'total_days',
      title: 'Duration',
      render: (row) => (
        <span className="leave-table-days">
          {row.total_days} {row.total_days === 1 ? 'day' : 'days'}
        </span>
      )
    },
    {
      key: 'reason',
      title: 'Reason / Remarks',
      render: (row) => <span className="leave-table-reason">{row.reason || '—'}</span>
    }
  ]

  return (
    <div className="page-wrapper leave-wrapper">
      
      {/* ── HEADER STRIP ──────────────────────────────────────── */}
      <header className="leave-header">
        <div>
          <h2 className="leave-title">Leave History Log</h2>
          <p className="leave-subtitle">Browse past leaves, annual quotas and record time-off approvals.</p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            icon={<RiCalendarEventLine />}
            onClick={() => setIsFormOpen(true)}
          >
            Record Leave
          </Button>
        )}
      </header>

      {/* ── FILTER STRIP ──────────────────────────────────────── */}
      <div className="leave-filters-card">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leaves by employee name or code..."
          actions={
            <div className="leave-filters-row">
              <RiFilterLine className="leave-filter-icon" />
              
              <Input
                type="select"
                name="leave_type_id"
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                options={leaveTypes}
                className="leave-filter-select"
              />
            </div>
          }
        />
      </div>

      {/* ── TABLE VIEW ─────────────────────────────────────────── */}
      <Table
        columns={columns}
        data={records}
        loading={loading}
        emptyMessage="No leave records matched your filters."
        pagination={pagination}
      />

      {/* ── RECORD DIALOG MODAL ────────────────────────────────── */}
      <LeaveFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaveSuccess={loadRecords}
      />

    </div>
  )
}
