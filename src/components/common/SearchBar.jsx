/**
 * SearchBar.jsx
 * -------------
 * Search and Filter input strip. Fits inside table control headers.
 * Uses a search icon and an optional custom right-side actions slot.
 *
 * Props:
 * @param {string} value - Text input query state
 * @param {function} onChange - Input change handler
 * @param {string} placeholder - Custom text hint (default: 'Search...')
 * @param {React.ReactNode} actions - Optional custom action buttons slot (e.g. "Add Employee")
 */

import { RiSearchLine } from 'react-icons/ri'
import Input from './Input'
import './SearchBar.css'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  actions = null,
}) {
  return (
    <div className="search-bar">
      <div className="search-bar-left">
        <Input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          icon={<RiSearchLine aria-hidden="true" />}
          className="search-bar-input"
        />
      </div>
      
      {actions && (
        <div className="search-bar-right">
          {actions}
        </div>
      )}
    </div>
  )
}
