/**
 * Modal.jsx
 * ---------
 * Accessible Dialog Modal overlay component.
 * Uses backdrop filter blurs, slide-up entrances, and manages body scrolling.
 *
 * Props:
 * @param {boolean} isOpen - Control visibility of the modal
 * @param {function} onClose - Triggers when clicking overlay close icons
 * @param {string} title - Header text
 * @param {string} size - 'sm', 'md', 'lg', 'xl' (default: 'md')
 */

import { useEffect } from 'react'
import { RiCloseLine } from 'react-icons/ri'
import './Modal.css'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal-container modal-container--${size}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
      >
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <RiCloseLine aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
