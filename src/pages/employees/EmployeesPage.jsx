/**
 * EmployeesPage.jsx
 * -----------------
 * Full Employee Listing management dashboard.
 * Supports paginated view, filters, details check, register form and soft delete operations.
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  RiUserAddLine,
  RiEyeLine,
  RiEditLine,
  RiDeleteBin6Line,
  RiFilterLine,
  RiCloseLine
} from 'react-icons/ri'
import { getEmployees, deleteEmployee, getActiveDepartments } from '@/services/employeeService'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/constants'
import { formatEnum } from '@/utils/formatters'

// UI common parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import SearchBar from '@/components/common/SearchBar'
import Input from '@/components/common/Input'
import ConfirmDialog from '@/components/common/ConfirmDialog'

// Details & Edit Modal components
import EmployeeDetailModal from './EmployeeDetailModal'
import EmployeeFormModal from './EmployeeFormModal'

import './EmployeesPage.css'

export default function EmployeesPage() {
  const { hasPermission } = usePermission()
  
  // Permissions checks
  const canCreate = hasPermission(PERMISSIONS.EMPLOYEES_CREATE)
  const canEdit   = hasPermission(PERMISSIONS.EMPLOYEES_EDIT)
  const canDelete = hasPermission(PERMISSIONS.EMPLOYEES_DELETE)

  // Listing states
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)

  // Filters & Pagination Hooks
  const [search, setSearch]             = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus]             = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const pagination = usePagination({ defaultPageSize: 10 })

  // Metadata options
  const [departments, setDepartments] = useState([])

  // Modal active states
  const [selectedEmp, setSelectedEmp]   = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  
  const [editingEmp, setEditingEmp]     = useState(null)
  const [isFormOpen, setIsFormOpen]     = useState(false)
  
  const [deletingEmp, setDeletingEmp]   = useState(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting]         = useState(false)

  // Fetch departments dropdown options
  useEffect(() => {
    async function loadDepts() {
      const { data } = await getActiveDepartments()
      if (data) {
        setDepartments([{ value: '', label: 'All Departments' }, ...data.map(d => ({ value: d.id, label: d.name }))])
      }
    }
    loadDepts()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // LOAD EMPLOYEES DATA
  // ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getEmployees({
      search: debouncedSearch,
      department: departmentId,
      status: status,
      rangeFrom: pagination.rangeFrom,
      rangeTo: pagination.rangeTo,
    })

    if (error) {
      toast.error('Failed to load employee records.')
    } else {
      setEmployees(data || [])
      pagination.setTotal(count)
    }
    setLoading(false)
  }, [debouncedSearch, departmentId, status, pagination.rangeFrom, pagination.rangeTo])

  // Reload data when active search query or page offsets update
  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset pagination page to 1 when search filters change
  useEffect(() => {
    pagination.reset()
  }, [debouncedSearch, departmentId, status])

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  function handleViewDetails(emp) {
    setSelectedEmp(emp)
    setIsDetailOpen(true)
  }

  function handleCreate() {
    setEditingEmp(null)
    setIsFormOpen(true)
  }

  function handleEdit(emp) {
    setEditingEmp(emp)
    setIsFormOpen(true)
  }

  function handleDeleteClick(emp) {
    setDeletingEmp(emp)
    setIsDeleteOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deletingEmp) return
    setDeleting(true)
    const { error } = await deleteEmployee(deletingEmp.id)
    setDeleting(false)
    setIsDeleteOpen(false)

    if (error) {
      toast.error(error.message || 'Failed to delete employee record.')
    } else {
      toast.success('Employee record successfully deleted.')
      loadData()
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'employee_code',
      title: 'Code',
      render: (row) => <span className="emp-table-code">{row.employee_code}</span>,
    },
    {
      key: 'full_name',
      title: 'Employee Name',
      render: (row) => (
        <div className="emp-table-profile">
          <div className="emp-table-avatar" aria-hidden="true">
            {row.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="emp-table-name">{row.full_name}</div>
            <div className="emp-table-email">{row.email || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      title: 'Department',
      render: (row) => <span>{row.departments?.name || '—'}</span>,
    },
    {
      key: 'designation',
      title: 'Designation',
      render: (row) => <span>{row.designations?.name || '—'}</span>,
    },
    {
      key: 'employment_type',
      title: 'Type',
      render: (row) => <span>{formatEnum(row.employment_type)}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="emp-table-actions">
          <button
            className="emp-action-btn emp-action-btn--view"
            onClick={() => handleViewDetails(row)}
            title="View full profile"
          >
            <RiEyeLine />
          </button>
          
          {canEdit && (
            <button
              className="emp-action-btn emp-action-btn--edit"
              onClick={() => handleEdit(row)}
              title="Edit employee"
            >
              <RiEditLine />
            </button>
          )}

          {canDelete && (
            <button
              className="emp-action-btn emp-action-btn--delete"
              onClick={() => handleDeleteClick(row)}
              title="Soft delete record"
            >
              <RiDeleteBin6Line />
            </button>
          )}
        </div>
      ),
    },
  ]

  // Status Filter options
  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'resigned', label: 'Resigned' }
  ]

  return (
    <div className="page-wrapper emp-wrapper">
      
      {/* ── HEADER ACTIONS strip ────────────────────────────────── */}
      <header className="emp-header">
        <div>
          <h2 className="emp-title">Employees Directory</h2>
          <p className="emp-subtitle">Manage employee records, job roles, schedules and bank info.</p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            icon={<RiUserAddLine />}
            onClick={handleCreate}
          >
            Register Employee
          </Button>
        )}
      </header>

      {/* ── FILTER CONTROLS ────────────────────────────────────── */}
      <div className="emp-filters-card">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees by name or employee code (e.g. EMP001)..."
          actions={
            <div className="emp-filters-row">
              <RiFilterLine className="emp-filter-icon" />
              
              <Input
                type="select"
                name="department_id"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={departments}
                className="emp-filter-select"
              />

              <Input
                type="select"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={statusFilterOptions}
                className="emp-filter-select"
              />
            </div>
          }
        />
      </div>

      {/* ── TABLE LIST ─────────────────────────────────────────── */}
      <Table
        columns={columns}
        data={employees}
        loading={loading}
        emptyMessage="No employees matched your active filter criteria."
        pagination={pagination}
      />

      {/* ── DETAIL PROFILE MODAL ───────────────────────────────── */}
      <EmployeeDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        employee={selectedEmp}
      />

      {/* ── ADD/EDIT FORM DIALOG ───────────────────────────────── */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employee={editingEmp}
        onSaveSuccess={loadData}
      />

      {/* ── SOFT DELETE CONFIRM DIALOG ─────────────────────────── */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Employee Record"
        message={`Are you sure you want to delete ${deletingEmp?.full_name}? This action will soft-delete their profile, hiding them from active payrolls and attendance tracking, but their data will remain archived.`}
        confirmText="Confirm Delete"
        loading={deleting}
        type="danger"
      />

    </div>
  )
}
