/**
 * ConfirmDialog.jsx
 * ----------------
 * Standard confirmation dialog for dangerous actions.
 *
 * Props:
 * @param {boolean} isOpen - Control visibility
 * @param {function} onConfirm - Fires when clicking the primary action button
 * @param {function} onCancel - Fires when clicking cancel
 * @param {string} title - Header title text
 * @param {string} message - Body text description of consequences
 * @param {string} confirmText - Label of primary action button (default: 'Confirm')
 * @param {string} cancelText - Label of cancel button (default: 'Cancel')
 * @param {boolean} loading - Shows loading state on confirm button
 * @param {string} type - 'danger' | 'warning' | 'info' (controls colors, default: 'warning')
 */

import { RiAlertLine, RiInformationLine, RiErrorWarningLine } from 'react-icons/ri'
import Modal from './Modal'
import Button from './Button'
import './ConfirmDialog.css'

const ICON_MAP = {
  danger:  { icon: RiErrorWarningLine, class: 'confirm-icon--danger' },
  warning: { icon: RiAlertLine,        class: 'confirm-icon--warning' },
  info:    { icon: RiInformationLine,  class: 'confirm-icon--info' },
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  type = 'warning',
}) {
  const cfg = ICON_MAP[type] || ICON_MAP.warning
  const IconComponent = cfg.icon

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="confirm-body">
        <div className="confirm-content-row">
          <div className={`confirm-icon-wrap ${cfg.class}`}>
            <IconComponent aria-hidden="true" />
          </div>
          <div className="confirm-text-wrap">
            <p className="confirm-message">{message}</p>
          </div>
        </div>

        <div className="confirm-actions">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
