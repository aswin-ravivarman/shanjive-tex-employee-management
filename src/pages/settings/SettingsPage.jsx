/**
 * SettingsPage.jsx
 * ----------------
 * Unified configuration dashboard for Shanjive Tex.
 * Manages:
 * 1. Company Information (company_settings)
 * 2. Shift Management (shifts)
 * 3. Holiday Logs (holidays)
 * 4. Department Lists (departments)
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { 
  RiSettingsLine, 
  RiBuilding4Line, 
  RiTimeLine, 
  RiCalendarEventLine, 
  RiGitBranchLine,
  RiAddLine,
  RiDeleteBin6Line,
  RiSaveLine,
  RiShieldUserLine,
  RiArrowLeftLine
} from 'react-icons/ri'
import { useAuth } from '@/hooks/useAuth'
import { getActiveDepartments } from '@/services/employeeService'
import { 
  getCompanySettings, saveCompanySettings,
  getShifts, saveShift, deleteShift as deleteShiftService,
  getHolidays, saveHoliday, deleteHoliday as deleteHolidayService,
  getDepartments, saveDepartment, deleteDepartment as deleteDepartmentService,
  getAdmins, getEmployeesForAdmin, createAdmin, convertEmployeeToAdmin, deactivateAdmin
} from '@/services/settingsService'
import { updateAdminPermissions } from '@/services/authService'
import { logActivity } from '@/services/activityLogService'
import { formatDate } from '@/utils/formatters'
// UI Parts
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'

import './SettingsPage.css'

const DEFAULT_ADMIN_PERMISSIONS = [
  'dashboard.view',
  'employees.view',
  'employees.create',
  'employees.edit',
  'employees.delete',
  'attendance.view',
  'attendance.manage',
  'leave.view',
  'leave.manage',

  'stock.view',
  'stock.manage',
  'reports.view_general',
  'reports.view_attendance',
  'reports.view_leaves',
  'reports.view_duty_summary'
];

const ACCESS_SECTIONS = [
  {
    category: 'Core Modules',
    items: [
      { key: 'dashboard.view', label: 'View Dashboard', description: 'Access to main stats and activity logs.' },
      { key: 'employees.view', label: 'View Employees List', description: 'View employee records list.' },
      { key: 'employees.create', label: 'Create Employees', description: 'Add new employees to the system.' },
      { key: 'employees.edit', label: 'Edit Employees', description: 'Modify existing employee profiles.' },
      { key: 'employees.delete', label: 'Delete Employees', description: 'Archive/delete employee profiles.' },
      { key: 'attendance.view', label: 'View Attendance Logs', description: 'View daily and monthly attendance logs.' },
      { key: 'attendance.manage', label: 'Manage Attendance', description: 'Mark/edit daily attendance logs and shifts.' },
      { key: 'leave.view', label: 'View Leave Logs', description: 'View leave requests and balances.' },
      { key: 'leave.manage', label: 'Manage Leaves', description: 'Approve, reject, or record leave entries.' }
    ]
  },
  {
    category: 'Sensitive Modules',
    items: [
      { key: 'payroll.view', label: 'View Payroll Cycles', description: 'Access to monthly payroll cycle calculations and payslips.' },
      { key: 'payroll.manage', label: 'Manage Payroll Cycles', description: 'Process new payroll runs, lock cycles, and disburse salaries.' },
      { key: 'advances.view', label: 'View Advances Paid', description: 'Access to log and record salary advances paid to employees.' },
      { key: 'advances.manage', label: 'Manage Advances Paid', description: 'Record new advances or settle outstanding balances.' },
      { key: 'wages_summary.view', label: 'View Wages Summary', description: 'Access to real-time monthly wages and salary sheet summary.' },
      { key: 'wages_summary.manage', label: 'Manage Wages Summary', description: 'Update fixed daily salary rates for employees.' },
      { key: 'settings.manage', label: 'Manage Company Settings', description: 'Alter company profile details and GST/PAN registrations.' }
    ]
  },
  {
    category: 'Reports & Analytics',
    items: [
      { key: 'reports.view_attendance', label: 'Attendance Dashboard Report', description: 'Generate/export attendance status lists.' },
      { key: 'reports.view_leaves', label: 'Leave Analytics Report', description: 'Generate/export leave summary metrics.' },
      { key: 'reports.view_duty_summary', label: 'Duty Summary Report', description: 'Generate/export overall employee duty totals and outstanding advances.' },
      { key: 'reports.view_payroll', label: 'Wages & Salary Sheet Report', description: 'Generate/export monthly wages, rates, and final payable sums.' }
    ]
  }
];

export default function SettingsPage() {
  const { appUser, user } = useAuth()
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(false)

  // 1. Company settings state
  const [companySettings, setCompanySettings] = useState({
    id: '',
    company_name: 'Shanjive Tex',
    address: '',
    phone: '',
    email: '',
    website: '',
    gst_number: '',
    pan_number: '',
  })

  // 2. Shifts state
  const [shifts, setShifts] = useState([])
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '18:00' })

  // 3. Holidays state
  const [holidays, setHolidays] = useState([])
  const [holidayModalOpen, setHolidayModalOpen] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ name: '', holiday_date: '', description: '' })

  // 4. Departments state
  const [departments, setDepartments] = useState([])
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })

  // 5. Admins state
  const [admins, setAdmins] = useState([])
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  
  // Make employee admin state
  const [employees, setEmployees] = useState([])
  const [makeAdminModalOpen, setMakeAdminModalOpen] = useState(false)
  const [makeAdminForm, setMakeAdminForm] = useState({ employeeId: '', email: '', password: '' })

  // Admin access management state
  const [selectedAdminForAccess, setSelectedAdminForAccess] = useState(null)
  const [pendingPermissionChange, setPendingPermissionChange] = useState(null) // { permissionKey, action: 'grant' | 'revoke', label }
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // DATA LOADERS
  // ─────────────────────────────────────────────────────────────
  
  // Load Company Settings
  const loadCompanySettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getCompanySettings()

      if (error) throw error
      if (data) {
        setCompanySettings(data)
      }
    } catch (err) {
      toast.error('Failed to load company settings: ' + err.message)
    }
    setLoading(false)
  }, [])

  // Load Shifts
  const loadShifts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getShifts()

      if (error) throw error
      setShifts(data || [])
    } catch (err) {
      toast.error('Failed to load shifts: ' + err.message)
    }
    setLoading(false)
  }, [])

  // Load Holidays
  const loadHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getHolidays()

      if (error) throw error
      setHolidays(data || [])
    } catch (err) {
      toast.error('Failed to load holidays: ' + err.message)
    }
    setLoading(false)
  }, [])

  // Load Departments
  const loadDepartments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getDepartments()

      if (error) throw error
      setDepartments(data || [])
    } catch (err) {
      toast.error('Failed to load departments: ' + err.message)
    }
    setLoading(false)
  }, [])

  // Load Admins
  const loadAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getAdmins()

      if (error) throw error
      setAdmins(data || [])
    } catch (err) {
      toast.error('Failed to load admins: ' + err.message)
    }
    setLoading(false)
  }, [])

  // Load active employees list for admin conversion
  const loadEmployeesForAdmin = useCallback(async () => {
    try {
      const { data, error } = await getEmployeesForAdmin()
      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      toast.error('Failed to load employees: ' + err.message)
    }
  }, [])

  // Initial loads
  useEffect(() => {
    if (activeTab === 'company') loadCompanySettings()
    if (activeTab === 'shifts') loadShifts()
    if (activeTab === 'holidays') loadHolidays()
    if (activeTab === 'departments') loadDepartments()
    if (activeTab === 'admins') {
      loadAdmins()
      loadEmployeesForAdmin()
    }
  }, [activeTab, loadCompanySettings, loadShifts, loadHolidays, loadDepartments, loadAdmins, loadEmployeesForAdmin])

  // ─────────────────────────────────────────────────────────────
  // SUBMISSIONS & ACTIONS
  // ─────────────────────────────────────────────────────────────

  // Save Company settings
  async function handleCompanySave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...companySettings }
      if (!payload.id) {
        delete payload.id
        payload.created_by = appUser?.id || null
      }
      payload.updated_by = appUser?.id || null

      const { error } = await saveCompanySettings(payload)

      if (error) throw error
      toast.success('Company settings saved successfully.')
      loadCompanySettings()
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message)
    }
    setLoading(false)
  }

  // Create Shift
  async function handleCreateShift(e) {
    e.preventDefault()
    try {
      const { error } = await saveShift(null, shiftForm)

      if (error) throw error
      toast.success('Shift created successfully.')
      setShiftModalOpen(false)
      loadShifts()
    } catch (err) {
      toast.error('Failed to create shift: ' + err.message)
    }
  }

  // Create Holiday
  async function handleCreateHoliday(e) {
    e.preventDefault()
    try {
      const { error } = await saveHoliday(null, holidayForm)

      if (error) throw error
      toast.success('Holiday added successfully.')
      setHolidayModalOpen(false)
      loadHolidays()
    } catch (err) {
      toast.error('Failed to add holiday: ' + err.message)
    }
  }

  // Create Department
  async function handleCreateDepartment(e) {
    e.preventDefault()
    try {
      const { error } = await saveDepartment(null, deptForm)

      if (error) throw error
      toast.success('Department created successfully.')
      setDeptModalOpen(false)
      loadDepartments()
    } catch (err) {
      toast.error('Failed to create department: ' + err.message)
    }
  }

  // Delete handlers (Soft Delete for departments)
  async function deleteHoliday(id) {
    try {
      const { error } = await deleteHolidayService(id)
      if (error) throw error
      toast.success('Holiday deleted.')
      loadHolidays()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deleteShift(id) {
    try {
      const { error } = await deleteShiftService(id)
      if (error) throw error
      toast.success('Shift deactivated.')
      loadShifts()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deleteDept(id) {
    try {
      const { error } = await deleteDepartmentService(id)
      if (error) throw error
      toast.success('Department soft deleted.')
      loadDepartments()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { fullName, email, phone, password } = adminForm

      if (!email || !fullName || !password) {
        throw new Error('Please fill in all required fields.')
      }

      await createAdmin(fullName, email, phone, password)

      // Log activity
      await logActivity(
        'settings',
        'create_admin',
        `Created new admin account for ${fullName} (${email})`
      )

      toast.success('Admin user created successfully.')
      setAdminModalOpen(false)
      setAdminForm({ fullName: '', email: '', phone: '', password: '' })
      loadAdmins()
    } catch (err) {
      toast.error('Failed to create admin: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteAdmin(id, name) {
    if (!window.confirm(`Are you sure you want to deactivate/delete admin ${name}?`)) return
    try {
      const { error } = await deactivateAdmin(id, false)
      if (error) throw error

      await logActivity('settings', 'delete_admin', `Deactivated admin user: ${name}`)

      toast.success('Admin user deactivated.')
      loadAdmins()
    } catch (err) {
      toast.error('Failed to deactivate admin: ' + err.message)
    }
  }

  async function handleConvertEmployeeToAdmin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { employeeId, email, password } = makeAdminForm

      if (!employeeId || !email || !password) {
        throw new Error('Please fill in all required fields.')
      }

      const selectedEmp = employees.find(emp => emp.id === employeeId)
      if (!selectedEmp) {
        throw new Error('Selected employee not found.')
      }

      await convertEmployeeToAdmin(employeeId, selectedEmp.full_name, email, password)

      await logActivity(
        'settings',
        'create_admin',
        `Converted employee ${selectedEmp.full_name} (${email}) to admin`
      )

      toast.success('Employee converted to Admin successfully.')
      setMakeAdminModalOpen(false)
      setMakeAdminForm({ employeeId: '', email: '', password: '' })
      loadAdmins()
      loadEmployeesForAdmin()
    } catch (err) {
      toast.error('Failed to convert employee to admin: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectEmployee(empId) {
    const selectedEmp = employees.find(emp => emp.id === empId)
    setMakeAdminForm(prev => ({
      ...prev,
      employeeId: empId,
      email: selectedEmp?.email || ''
    }))
  }

  const handleToggleClick = (permissionKey, isCurrentlyGranted, label) => {
    setPendingPermissionChange({
      permissionKey,
      action: isCurrentlyGranted ? 'revoke' : 'grant',
      label
    })
    setConfirmDialogOpen(true)
  }

  const handleConfirmPermissionChange = async () => {
    if (!pendingPermissionChange || !selectedAdminForAccess) return
    
    const { permissionKey, action, label } = pendingPermissionChange
    
    // Seed permissions if they were null/undefined in the DB
    let currentPerms = selectedAdminForAccess.custom_permissions
    if (!currentPerms || !Array.isArray(currentPerms)) {
      currentPerms = [...DEFAULT_ADMIN_PERMISSIONS]
    }

    const DEPENDENT_MODULES = ['payroll', 'advances', 'wages_summary'];
    
    // Toggle logic on Grant: server-side validation
    if (action === 'grant') {
      const isManageDependency = DEPENDENT_MODULES.some(mod => permissionKey === `${mod}.manage`);
      if (isManageDependency) {
        const moduleName = permissionKey.split('.')[0];
        const viewKey = `${moduleName}.view`;
        if (!currentPerms.includes(viewKey)) {
          toast.error("Cannot grant Manage access without View access.");
          setConfirmDialogOpen(false);
          setPendingPermissionChange(null);
          return;
        }
      }
    }

    setLoading(true)
    try {
      let updatedPerms = []
      let cascadedManageKey = null;
      let logDescCascade = null;

      if (action === 'grant') {
        if (!currentPerms.includes(permissionKey)) {
          updatedPerms = [...currentPerms, permissionKey]
        } else {
          updatedPerms = [...currentPerms]
        }
      } else {
        updatedPerms = currentPerms.filter(p => p !== permissionKey)

        // Toggle logic on Revoke — cascade down
        const isViewDependency = DEPENDENT_MODULES.some(mod => permissionKey === `${mod}.view`);
        if (isViewDependency) {
          const moduleName = permissionKey.split('.')[0];
          const manageKey = `${moduleName}.manage`;
          if (updatedPerms.includes(manageKey)) {
            updatedPerms = updatedPerms.filter(p => p !== manageKey);
            cascadedManageKey = manageKey;
            
            // Generate audit log text
            const manageItem = ACCESS_SECTIONS.flatMap(s => s.items).find(i => i.key === manageKey);
            const manageLabel = manageItem ? manageItem.label : manageKey;
            logDescCascade = `Automatically revoked '${manageKey}' permission for admin ${selectedAdminForAccess.full_name} because View access was revoked`;
          }
        }
      }
      
      // Update via authService layer
      const { data, error } = await updateAdminPermissions(
        selectedAdminForAccess.id,
        updatedPerms,
        {
          permissionKey,
          action,
          adminName: selectedAdminForAccess.full_name
        }
      )
      
      if (error) throw error
      
      toast.success(`Access to "${label}" successfully ${action === 'grant' ? 'granted' : 'revoked'}.`)
      
      // Activity logging for cascade
      if (cascadedManageKey && logDescCascade) {
        toast.info("Automatically revoked Manage access due to View dependency.");
        await logActivity('settings', 'manage_admin_access', logDescCascade);
      }
      
      // Refresh local states
      setSelectedAdminForAccess(data)
      // Also refresh the overall admins list so if they exit, it is up-to-date
      loadAdmins()
    } catch (err) {
      toast.error('Failed to update admin permissions: ' + err.message)
    } finally {
      setLoading(false)
      setConfirmDialogOpen(false)
      setPendingPermissionChange(null)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TABLES COLUMNS DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const shiftColumns = [
    { key: 'name', title: 'Shift Name', render: (row) => <strong>{row.name}</strong> },
    { key: 'start', title: 'Start Time', render: (row) => <span>{row.start_time}</span> },
    { key: 'end', title: 'End Time', render: (row) => <span>{row.end_time}</span> },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (row) => (
        <Button variant="danger" size="sm" icon={<RiDeleteBin6Line />} onClick={() => deleteShift(row.id)}>Deactivate</Button>
      )
    }
  ]

  const holidayColumns = [
    { key: 'date', title: 'Date', render: (row) => <strong>{formatDate(row.holiday_date)}</strong> },
    { key: 'name', title: 'Holiday Occasion', render: (row) => <span>{row.name}</span> },
    { key: 'desc', title: 'Description', render: (row) => <span>{row.description || '—'}</span> },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (row) => (
        <Button variant="danger" size="sm" icon={<RiDeleteBin6Line />} onClick={() => deleteHoliday(row.id)}>Delete</Button>
      )
    }
  ]

  const deptColumns = [
    { key: 'name', title: 'Department Name', render: (row) => <strong>{row.name}</strong> },
    { key: 'desc', title: 'Description', render: (row) => <span>{row.description || '—'}</span> },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (row) => (
        <Button variant="danger" size="sm" icon={<RiDeleteBin6Line />} onClick={() => deleteDept(row.id)}>Delete</Button>
      )
    }
  ]

  const adminColumns = [
    { key: 'full_name', title: 'Full Name', render: (row) => <strong>{row.full_name}</strong> },
    { key: 'email', title: 'Email Address', render: (row) => <span>{row.email}</span> },
    { key: 'phone', title: 'Phone Number', render: (row) => <span>{row.phone || '—'}</span> },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <span className={`badge ${row.is_active ? 'badge--success' : 'badge--danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button 
            variant="outline" 
            size="sm" 
            icon={<RiShieldUserLine />} 
            onClick={() => setSelectedAdminForAccess(row)}
          >
            Manage Access
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            icon={<RiDeleteBin6Line />} 
            onClick={() => deleteAdmin(row.id, row.full_name)}
          >
            Deactivate
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="page-wrapper set-wrapper">
      
      <header className="set-header">
        <div>
          <h2 className="set-title">System Settings</h2>
          <p className="set-subtitle">Configure company details, operating shifts, holiday lists, and departments.</p>
        </div>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="set-tabs">
        <button className={`set-tab ${activeTab === 'company' ? 'set-tab--active' : ''}`} onClick={() => setActiveTab('company')}>
          <RiBuilding4Line className="set-tab-icon" /> Company Info
        </button>
        <button className={`set-tab ${activeTab === 'shifts' ? 'set-tab--active' : ''}`} onClick={() => setActiveTab('shifts')}>
          <RiTimeLine className="set-tab-icon" /> Shift Scheduler
        </button>
        <button className={`set-tab ${activeTab === 'holidays' ? 'set-tab--active' : ''}`} onClick={() => setActiveTab('holidays')}>
          <RiCalendarEventLine className="set-tab-icon" /> Holidays
        </button>
        <button className={`set-tab ${activeTab === 'departments' ? 'set-tab--active' : ''}`} onClick={() => setActiveTab('departments')}>
          <RiGitBranchLine className="set-tab-icon" /> Departments
        </button>
        {appUser?.role === 'super_admin' && (
          <button className={`set-tab ${activeTab === 'admins' ? 'set-tab--active' : ''}`} onClick={() => setActiveTab('admins')}>
            <RiShieldUserLine className="set-tab-icon" /> Admin Users
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'company' && (
        <form onSubmit={handleCompanySave} className="set-panel set-form-panel">
          <h3 className="set-panel-title">Company Profile</h3>
          
          <div className="set-form-grid">
            <Input
              label="Company Name"
              value={companySettings.company_name}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, company_name: e.target.value }))}
              required
            />
            <Input
              label="Website"
              value={companySettings.website || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, website: e.target.value }))}
            />
            <Input
              label="Phone Number"
              value={companySettings.phone || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Email Address"
              value={companySettings.email || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              label="GST Registration Number"
              value={companySettings.gst_number || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, gst_number: e.target.value }))}
            />
            <Input
              label="PAN Number"
              value={companySettings.pan_number || ''}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, pan_number: e.target.value }))}
            />
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                type="textarea"
                label="Registered Address"
                value={companySettings.address || ''}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>

          <div className="set-form-actions">
            <Button type="submit" loading={loading} icon={<RiSaveLine />}>
              Save Settings
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'shifts' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h3 className="set-panel-title">Working Shifts</h3>
            <Button variant="primary" icon={<RiAddLine />} onClick={() => { setShiftForm({ name: '', start_time: '09:00', end_time: '18:00' }); setShiftModalOpen(true); }}>
              Add Shift
            </Button>
          </div>
          <Table columns={shiftColumns} data={shifts} loading={loading} />
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h3 className="set-panel-title">Annual Holidays</h3>
            <Button variant="primary" icon={<RiAddLine />} onClick={() => { setHolidayForm({ name: '', holiday_date: '', description: '' }); setHolidayModalOpen(true); }}>
              Add Holiday
            </Button>
          </div>
          <Table columns={holidayColumns} data={holidays} loading={loading} />
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h3 className="set-panel-title">Departments</h3>
            <Button variant="primary" icon={<RiAddLine />} onClick={() => { setDeptForm({ name: '', description: '' }); setDeptModalOpen(true); }}>
              Add Department
            </Button>
          </div>
          <Table columns={deptColumns} data={departments} loading={loading} />
        </div>
      )}

      {activeTab === 'admins' && appUser?.role === 'super_admin' && (
        selectedAdminForAccess ? (
          <div className="set-panel">
            <div className="set-panel-header" style={{ marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<RiArrowLeftLine />} 
                  onClick={() => setSelectedAdminForAccess(null)}
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  Back to Admin Users
                </Button>
                <h3 className="set-panel-title">Manage Access Permissions</h3>
                <p className="set-subtitle" style={{ marginTop: 'var(--space-1)' }}>
                  Configuring granular access for <strong>{selectedAdminForAccess.full_name}</strong> ({selectedAdminForAccess.email})
                </p>
              </div>
            </div>

            <div className="permissions-management-flow">
              {ACCESS_SECTIONS.map((section) => (
                <div key={section.category} className="permissions-group-card" style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 className="permissions-group-title" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    {section.category}
                  </h4>
                  
                  <div className="permissions-rows-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {section.items.map((item) => {
                      // Check if granted
                      let hasAccess = false
                      const currentPerms = (selectedAdminForAccess.custom_permissions && Array.isArray(selectedAdminForAccess.custom_permissions)) 
                        ? selectedAdminForAccess.custom_permissions 
                        : DEFAULT_ADMIN_PERMISSIONS;
                        
                      hasAccess = currentPerms.includes(item.key)

                      // 1. Visual dependency check
                      const DEPENDENT_MODULES = ['payroll', 'advances', 'wages_summary'];
                      const isManageDependency = DEPENDENT_MODULES.some(mod => item.key === `${mod}.manage`);
                      let isManageDisabled = false;
                      let requiredViewLabel = '';

                      if (isManageDependency) {
                        const moduleName = item.key.split('.')[0];
                        const viewKey = `${moduleName}.view`;
                        
                        if (!currentPerms.includes(viewKey)) {
                          isManageDisabled = true;
                          const viewItem = ACCESS_SECTIONS.flatMap(s => s.items).find(i => i.key === viewKey);
                          requiredViewLabel = viewItem ? viewItem.label : 'View access';
                        }
                      }

                      return (
                        <div key={item.key} className="permission-row-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: isManageDisabled ? 'var(--color-neutral-100)' : 'var(--color-neutral-50)', opacity: isManageDisabled ? 0.7 : 1, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', transition: 'all 0.2s' }}>
                          <div style={{ flex: 1, paddingRight: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{item.label}</strong>
                              <span className={`badge ${hasAccess ? 'badge--success' : 'badge--danger'}`} style={{ fontSize: '0.7rem', padding: 'var(--space-1) var(--space-2)' }}>
                                {hasAccess ? 'Access Granted' : 'Access Denied'}
                              </span>
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0 0 0' }}>
                              {item.description}
                              {isManageDisabled && (
                                <span style={{ display: 'block', color: 'var(--color-danger)', marginTop: 'var(--space-1)', fontStyle: 'italic', fontWeight: '500' }}>
                                  Grant '{requiredViewLabel}' first to enable this.
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <Button
                              variant={hasAccess ? 'danger' : 'primary'}
                              size="sm"
                              disabled={isManageDisabled}
                              onClick={() => handleToggleClick(item.key, hasAccess, item.label)}
                            >
                              {hasAccess ? 'Revoke Access' : 'Grant Access'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="set-panel">
            <div className="set-panel-header">
              <h3 className="set-panel-title">Admin Management</h3>
              <div className="set-admins-actions">
                <Button
                  variant="outline"
                  icon={<RiShieldUserLine />}
                  onClick={() => { setMakeAdminForm({ employeeId: '', email: '', password: '' }); setMakeAdminModalOpen(true); }}
                >
                  Make Employee Admin
                </Button>
                <Button
                  variant="primary"
                  icon={<RiAddLine />}
                  onClick={() => { setAdminForm({ fullName: '', email: '', phone: '', password: '' }); setAdminModalOpen(true); }}
                >
                  Add Admin
                </Button>
              </div>
            </div>
            <Table columns={adminColumns} data={admins} loading={loading} />
          </div>
        )
      )}

      {/* Shifts Modal */}
      <Modal isOpen={shiftModalOpen} onClose={() => setShiftModalOpen(false)} title="Create Shift" size="sm">
        <form onSubmit={handleCreateShift} className="set-modal-form">
          <Input label="Shift Name" required value={shiftForm.name} onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Day Shift" />
          <Input label="Start Time" type="time" required value={shiftForm.start_time} onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))} />
          <Input label="End Time" type="time" required value={shiftForm.end_time} onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))} />
          <div className="set-modal-actions">
            <Button variant="secondary" onClick={() => setShiftModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Shift</Button>
          </div>
        </form>
      </Modal>

      {/* Holiday Modal */}
      <Modal isOpen={holidayModalOpen} onClose={() => setHolidayModalOpen(false)} title="Add Holiday" size="sm">
        <form onSubmit={handleCreateHoliday} className="set-modal-form">
          <Input label="Holiday Name" required value={holidayForm.name} onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Diwali" />
          <Input label="Date" type="date" required value={holidayForm.holiday_date} onChange={(e) => setHolidayForm(prev => ({ ...prev, holiday_date: e.target.value }))} />
          <Input label="Description" value={holidayForm.description} onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))} placeholder="e.g. Festival holiday" />
          <div className="set-modal-actions">
            <Button variant="secondary" onClick={() => setHolidayModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Holiday</Button>
          </div>
        </form>
      </Modal>

      {/* Dept Modal */}
      <Modal isOpen={deptModalOpen} onClose={() => setDeptModalOpen(false)} title="Add Department" size="sm">
        <form onSubmit={handleCreateDepartment} className="set-modal-form">
          <Input label="Department Name" required value={deptForm.name} onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Logistics" />
          <Input label="Description" value={deptForm.description} onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))} placeholder="e.g. Material handling and dispatches" />
          <div className="set-modal-actions">
            <Button variant="secondary" onClick={() => setDeptModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Department</Button>
          </div>
        </form>
      </Modal>

      {/* Admins Modal */}
      <Modal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title="Add Admin User" size="sm">
        <form onSubmit={handleCreateAdmin} className="set-modal-form">
          <Input 
            label="Full Name" 
            required 
            value={adminForm.fullName} 
            onChange={(e) => setAdminForm(prev => ({ ...prev, fullName: e.target.value }))} 
            placeholder="e.g. Anand K" 
          />
          <Input 
            label="Email Address" 
            type="email"
            required 
            value={adminForm.email} 
            onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))} 
            placeholder="you@shanjive.com" 
          />
          <Input 
            label="Phone Number" 
            value={adminForm.phone} 
            onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))} 
            placeholder="e.g. 9840123456" 
          />
          <Input 
            label="Password" 
            type="password"
            required 
            value={adminForm.password} 
            onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))} 
            placeholder="Enter password (min 6 characters)" 
          />
          <div className="set-modal-actions">
            <Button variant="secondary" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Admin</Button>
          </div>
        </form>
      </Modal>

      {/* Make Employee as Admin Modal */}
      <Modal isOpen={makeAdminModalOpen} onClose={() => setMakeAdminModalOpen(false)} title="Make Employee Admin" size="sm">
        <form onSubmit={handleConvertEmployeeToAdmin} className="set-modal-form">
          <div className="set-make-admin-info">
            <RiShieldUserLine className="set-make-admin-icon" />
            <p className="set-make-admin-desc">Select an active employee to grant them admin login access. They will be able to log in but won't have access to payroll, reports, or settings.</p>
          </div>
          <div className="form-field">
            <label className="form-label">Select Employee <span className="form-label-required" aria-hidden="true"> *</span></label>
            <div className="form-input-wrapper">
              <select
                required
                className="form-input form-select"
                value={makeAdminForm.employeeId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
              >
                <option value="">— Choose an employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}{emp.email ? ` (${emp.email})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Login Email"
            type="email"
            required
            value={makeAdminForm.email}
            onChange={(e) => setMakeAdminForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="admin@shanjive.com"
            helperText={makeAdminForm.employeeId && employees.find(e => e.id === makeAdminForm.employeeId)?.email
              ? 'Auto-filled from employee record. You may change it.'
              : 'This employee has no email on record. Please enter one.'}
          />
          <Input
            label="Password"
            type="password"
            required
            value={makeAdminForm.password}
            onChange={(e) => setMakeAdminForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter password (min 6 characters)"
          />
          <div className="set-modal-actions">
            <Button variant="secondary" onClick={() => setMakeAdminModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading} icon={<RiShieldUserLine />}>Grant Admin Access</Button>
          </div>
        </form>
      </Modal>

      {/* Permission Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onCancel={() => { setConfirmDialogOpen(false); setPendingPermissionChange(null); }}
        onConfirm={handleConfirmPermissionChange}
        title={pendingPermissionChange?.action === 'grant' ? 'Grant Access Permission' : 'Revoke Access Permission'}
        message={
          pendingPermissionChange?.action === 'grant'
            ? `Are you sure you want to grant access to "${pendingPermissionChange?.label}" for ${selectedAdminForAccess?.full_name}?`
            : `Are you sure you want to revoke access to "${pendingPermissionChange?.label}" for ${selectedAdminForAccess?.full_name}?`
        }
        confirmText={pendingPermissionChange?.action === 'grant' ? 'Confirm Grant' : 'Confirm Revoke'}
        loading={loading}
        type={pendingPermissionChange?.action === 'grant' ? 'info' : 'warning'}
      />

    </div>
  )
}
