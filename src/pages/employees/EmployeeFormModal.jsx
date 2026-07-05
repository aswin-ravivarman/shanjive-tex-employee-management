/**
 * EmployeeFormModal.jsx
 * --------------------
 * Modal wrapping form inputs to Add or Edit Employee records.
 */

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import {
  getActiveDepartments,
  getActiveDesignations,
  getActiveShifts,
  createEmployee,
  updateEmployee
} from '@/services/employeeService'
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateAadhaar,
  validatePAN,
  validateIFSC
} from '@/utils/validators'
import {
  GENDER_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS
} from '@/utils/constants'
import './EmployeeFormModal.css'

const INITIAL_FORM_STATE = {
  employee_code: '',
  full_name: '',
  gender: 'male',
  date_of_birth: '',
  mobile_number: '',
  email: '',
  address: '',
  joining_date: new Date().toISOString().split('T')[0],
  employment_type: 'full_time',
  blood_group: '',
  aadhaar_number: '',
  pan_number: '',
  bank_name: '',
  bank_account_number: '',
  ifsc_code: '',
  photo_url: '',
  department_id: '',
  designation_id: '',
  default_shift_id: '',
  status: 'active',
  extra_details: ''
}

export default function EmployeeFormModal({ isOpen, onClose, employee, onSaveSuccess }) {
  const isEdit = !!employee

  // Form states
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Options fetched from DB
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [allDesignations, setAllDesignations] = useState([]) // Untempered list for department filtering
  const [shifts, setShifts] = useState([])

  // Load Dropdown Metadata on Mount
  useEffect(() => {
    if (!isOpen) return

    async function loadMetadata() {
      const [deptRes, desRes, shiftRes] = await Promise.all([
        getActiveDepartments(),
        getActiveDesignations(),
        getActiveShifts()
      ])

      const deptOpts = (deptRes.data || []).map(d => ({ value: d.id, label: d.name }))
      const rawDes = desRes.data || []
      const shiftOpts = (shiftRes.data || []).map(s => ({ value: s.id, label: s.name }))

      setDepartments([{ value: '', label: 'Select Department' }, ...deptOpts])
      setAllDesignations(rawDes)
      setShifts([{ value: '', label: 'Select Shift' }, ...shiftOpts])

      // If editing, fill in original employee details
      if (employee) {
        setFormData({
          employee_code:       employee.employee_code || '',
          full_name:           employee.full_name || '',
          gender:              employee.gender || 'male',
          date_of_birth:       employee.date_of_birth || '',
          mobile_number:       employee.mobile_number || '',
          email:               employee.email || '',
          address:             employee.address || '',
          joining_date:        employee.joining_date || '',
          employment_type:     employee.employment_type || 'full_time',
          blood_group:         employee.blood_group || '',
          aadhaar_number:      employee.aadhaar_number || '',
          pan_number:          employee.pan_number || '',
          bank_name:           employee.bank_name || '',
          bank_account_number: employee.bank_account_number || '',
          ifsc_code:           employee.ifsc_code || '',
          photo_url:           employee.photo_url || '',
          department_id:       employee.department_id || '',
          designation_id:      employee.designation_id || '',
          default_shift_id:    employee.default_shift_id || '',
          status:              employee.status || 'active',
          extra_details:       employee.extra_details || ''
        })
        
        // Filter designations by loaded department
        filterDesignationsList(employee.department_id, rawDes)
      } else {
        setFormData({
          ...INITIAL_FORM_STATE,
          joining_date: new Date().toISOString().split('T')[0]
        })
        setDesignations([{ value: '', label: 'Select Department First' }])
      }
      setErrors({})
    }

    loadMetadata()
  }, [isOpen, employee])

  // Filter designations dropdown depending on chosen department
  function filterDesignationsList(deptId, masterList = allDesignations) {
    if (!deptId) {
      setDesignations([{ value: '', label: 'Select Department First' }])
      return
    }
    const filtered = masterList.filter(d => d.department_id === deptId)
    const opts = filtered.map(d => ({ value: d.id, label: d.name }))
    setDesignations([{ value: '', label: 'Select Designation' }, ...opts])
  }

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // If changing department, filter and reset designation
    if (name === 'department_id') {
      filterDesignationsList(value)
      setFormData(prev => ({ ...prev, department_id: value, designation_id: '' }))
    }
  }

  function validate() {
    const err = {}

    // Required check
    const nameErr = validateRequired(formData.full_name, 'Full Name')
    if (nameErr) err.full_name = nameErr

    const deptErr = validateRequired(formData.department_id, 'Department')
    if (deptErr) err.department_id = deptErr

    const desErr = validateRequired(formData.designation_id, 'Designation')
    if (desErr) err.designation_id = desErr

    const joinErr = validateRequired(formData.joining_date, 'Joining Date')
    if (joinErr) err.joining_date = joinErr

    // Format validators (only check if value is entered to make them optional)
    if (formData.email) {
      const emailErr = validateEmail(formData.email)
      if (emailErr) err.email = emailErr
    }

    if (formData.mobile_number) {
      const phoneErr = validatePhone(formData.mobile_number)
      if (phoneErr) err.mobile_number = phoneErr
    }

    if (formData.aadhaar_number) {
      const aadhaarErr = validateAadhaar(formData.aadhaar_number)
      if (aadhaarErr) err.aadhaar_number = aadhaarErr
    }

    if (formData.pan_number) {
      const panErr = validatePAN(formData.pan_number)
      if (panErr) err.pan_number = panErr
    }

    if (formData.ifsc_code) {
      const ifscErr = validateIFSC(formData.ifsc_code)
      if (ifscErr) err.ifsc_code = ifscErr
    }

    setErrors(err)
    return Object.keys(err).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      toast.warn('Please correct the validation errors in the form.')
      return
    }

    setSaving(true)
    
    // Clean payloads
    const payload = { ...formData }
    if (!payload.date_of_birth) delete payload.date_of_birth
    if (!payload.default_shift_id) delete payload.default_shift_id

    const { error } = isEdit
      ? await updateEmployee(employee.id, payload)
      : await createEmployee(payload)

    setSaving(false)

    if (error) {
      toast.error(error.message || 'Failed to save employee record.')
      return
    }

    toast.success(isEdit ? 'Employee updated successfully.' : 'Employee created successfully.')
    onSaveSuccess()
    onClose()
  }

  // Options lists converted to dropdown format
  const genderOpts = GENDER_OPTIONS.map(g => ({ value: g.value, label: g.label }))
  const empTypeOpts = EMPLOYMENT_TYPE_OPTIONS.map(t => ({ value: t.value, label: t.label }))
  const statusOpts = EMPLOYEE_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Profile: ${employee.full_name}` : 'Register New Employee'}
      size="xl"
    >
      <form className="emp-form" onSubmit={handleSubmit} noValidate>
        <div className="emp-form-sections">
          
          {/* Section 1: Employment Details */}
          <div className="emp-form-section">
            <h4 className="emp-form-section-title">1. Organization Details</h4>
            <div className="emp-form-row">
              {isEdit && (
                <Input
                  label="Employee Code"
                  name="employee_code"
                  value={formData.employee_code}
                  disabled
                  helperText="Employee codes cannot be changed after registration."
                />
              )}
              
              <Input
                type="select"
                label="Department"
                name="department_id"
                required
                value={formData.department_id}
                onChange={handleChange}
                options={departments}
                error={errors.department_id}
              />

              <Input
                type="select"
                label="Designation"
                name="designation_id"
                required
                value={formData.designation_id}
                onChange={handleChange}
                options={designations}
                error={errors.designation_id}
                disabled={!formData.department_id}
              />
            </div>
            
            <div className="emp-form-row">
              <Input
                type="select"
                label="Employment Type"
                name="employment_type"
                required
                value={formData.employment_type}
                onChange={handleChange}
                options={empTypeOpts}
              />

              <Input
                type="date"
                label="Joining Date"
                name="joining_date"
                required
                value={formData.joining_date}
                onChange={handleChange}
                error={errors.joining_date}
              />

              <Input
                type="select"
                label="Default Shift"
                name="default_shift_id"
                value={formData.default_shift_id}
                onChange={handleChange}
                options={shifts}
              />
            </div>

            {isEdit && (
              <div className="emp-form-row emp-form-row--half">
                <Input
                  type="select"
                  label="Employment Status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  options={statusOpts}
                />
              </div>
            )}
          </div>

          {/* Section 2: General Bio Details */}
          <div className="emp-form-section">
            <h4 className="emp-form-section-title">2. Bio & Demographics</h4>
            <div className="emp-form-row">
              <Input
                label="Full Name"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Ramesh Kumar"
                error={errors.full_name}
              />
              
              <Input
                type="select"
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                options={genderOpts}
              />

              <Input
                type="date"
                label="Date of Birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="emp-form-row">
              <Input
                label="Mobile Number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                error={errors.mobile_number}
              />

              <Input
                type="email"
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. name@domain.com"
                error={errors.email}
              />

              <Input
                label="Blood Group"
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                placeholder="e.g. O+ or A-"
              />
            </div>

            <div className="emp-form-row emp-form-row--full">
              <Input
                type="textarea"
                label="Current Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter residential address..."
              />
            </div>
          </div>

          {/* Section 3: Bank & Statutory Details */}
          <div className="emp-form-section">
            <h4 className="emp-form-section-title">3. Statutory & Banking Details</h4>
            <div className="emp-form-row">
              <Input
                label="Aadhaar Card Number"
                name="aadhaar_number"
                value={formData.aadhaar_number}
                onChange={handleChange}
                placeholder="12-digit number"
                error={errors.aadhaar_number}
              />

              <Input
                label="PAN Number"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                placeholder="10-character alphanumeric"
                error={errors.pan_number}
              />
            </div>

            <div className="emp-form-row">
              <Input
                label="Bank Name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="e.g. State Bank of India"
              />

              <Input
                label="Bank Account Number"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                placeholder="Enter account number"
              />

              <Input
                label="IFSC Code"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                placeholder="11-character code"
                error={errors.ifsc_code}
              />
            </div>
          </div>

          {/* Section 4: Remarks */}
          <div className="emp-form-section">
            <h4 className="emp-form-section-title">4. Additional Notes</h4>
            <div className="emp-form-row emp-form-row--full">
              <Input
                type="textarea"
                label="Extra Details"
                name="extra_details"
                value={formData.extra_details}
                onChange={handleChange}
                placeholder="Any special remarks or additional qualifications..."
              />
            </div>
          </div>

        </div>

        {/* Actions bar */}
        <div className="emp-form-actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Register Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
