/**
 * EmployeeDetailModal.jsx
 * -----------------------
 * Modal showing full detailed visual profile summary of an employee.
 */

import Modal from '@/components/common/Modal'
import Badge from '@/components/common/Badge'
import {
  formatDate,
  formatEnum,
  formatPhone,
  maskAadhaar,
  maskPan
} from '@/utils/formatters'
import './EmployeeDetailModal.css'

export default function EmployeeDetailModal({ isOpen, onClose, employee }) {
  if (!employee) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile Details" size="lg">
      <div className="emp-detail">
        
        {/* Header Summary Banner */}
        <div className="emp-detail-header">
          <div className="emp-detail-avatar">
            {employee.photo_url ? (
              <img src={employee.photo_url} alt={employee.full_name} className="emp-detail-img" />
            ) : (
              <span className="emp-detail-initials">
                {employee.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="emp-detail-title-block">
            <h2 className="emp-detail-name">{employee.full_name}</h2>
            <div className="emp-detail-subtitle">
              <span className="emp-detail-code">{employee.employee_code}</span>
              <span className="emp-detail-dot-separator">•</span>
              <span className="emp-detail-role">
                {employee.designations?.name || 'Unassigned'} ({employee.departments?.name || 'No Dept'})
              </span>
            </div>
            <div className="emp-detail-badge-row">
              <Badge status={employee.status} />
              <Badge status={employee.employment_type} label={formatEnum(employee.employment_type)} />
            </div>
          </div>
        </div>

        {/* Info Grid Split */}
        <div className="emp-detail-grid">
          
          {/* Section 1: General Details */}
          <div className="emp-detail-section">
            <h3 className="emp-detail-section-title">General Information</h3>
            <div className="emp-detail-fields">
              <div className="emp-detail-field">
                <span className="emp-detail-label">Gender</span>
                <span className="emp-detail-val">{formatEnum(employee.gender) || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Date of Birth</span>
                <span className="emp-detail-val">{formatDate(employee.date_of_birth) || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Mobile Number</span>
                <span className="emp-detail-val">{formatPhone(employee.mobile_number) || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Email Address</span>
                <span className="emp-detail-val">{employee.email || '—'}</span>
              </div>
              <div className="emp-detail-field emp-detail-field--full">
                <span className="emp-detail-label">Address</span>
                <span className="emp-detail-val">{employee.address || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Work & Shift details */}
          <div className="emp-detail-section">
            <h3 className="emp-detail-section-title">Work & Schedule</h3>
            <div className="emp-detail-fields">
              <div className="emp-detail-field">
                <span className="emp-detail-label">Joining Date</span>
                <span className="emp-detail-val">{formatDate(employee.joining_date)}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Default Shift</span>
                <span className="emp-detail-val">{employee.shifts?.name || 'General Shift'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Blood Group</span>
                <span className="emp-detail-val">{employee.blood_group || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory IDs */}
          <div className="emp-detail-section">
            <h3 className="emp-detail-section-title">Statutory Details</h3>
            <div className="emp-detail-fields">
              <div className="emp-detail-field">
                <span className="emp-detail-label">Aadhaar Number</span>
                <span className="emp-detail-val">{maskAadhaar(employee.aadhaar_number) || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">PAN Number</span>
                <span className="emp-detail-val">{maskPan(employee.pan_number) || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="emp-detail-section">
            <h3 className="emp-detail-section-title">Bank Information</h3>
            <div className="emp-detail-fields">
              <div className="emp-detail-field">
                <span className="emp-detail-label">Bank Name</span>
                <span className="emp-detail-val">{employee.bank_name || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">Account Number</span>
                <span className="emp-detail-val">{employee.bank_account_number || '—'}</span>
              </div>
              <div className="emp-detail-field">
                <span className="emp-detail-label">IFSC Code</span>
                <span className="emp-detail-val">{employee.ifsc_code || '—'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Notes/Remarks */}
        {employee.extra_details && (
          <div className="emp-detail-remarks">
            <span className="emp-detail-label">Additional Details / Notes</span>
            <p className="emp-detail-notes-text">{employee.extra_details}</p>
          </div>
        )}

      </div>
    </Modal>
  )
}
