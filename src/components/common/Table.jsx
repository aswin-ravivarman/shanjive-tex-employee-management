/**
 * Table.jsx
 * ---------
 * Premium UI table component matching the Shanjive Tex design system.
 * Handles headers, scroll containers, empty states, and pagination footer seamlessly.
 *
 * Props:
 * @param {Array<object>} columns - Array of columns: { key, title, render(row), align: 'left'|'center'|'right' }
 * @param {Array<object>} data - Array of row data objects
 * @param {boolean} loading - Displays animated skeletons on rows
 * @param {string} emptyMessage - Message shown when no data matches filters
 * @param {object} pagination - Optional pagination controls matching the usePagination hook
 */

import { RiInboxLine } from 'react-icons/ri'
import Button from './Button'
import './Table.css'

export default function Table({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  pagination = null
}) {
  const hasData = data && data.length > 0

  return (
    <div className="table-card">
      <div className="table-scroll-container">
        <table className="table-element">
          <thead className="table-thead">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: col.align || 'left', width: col.width || 'auto' }}
                  className={`table-th ${col.className || ''}`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="table-tbody">
            {loading ? (
              // Skeletal loading state
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`} className="table-row">
                  {columns.map((col) => (
                    <td key={`skeleton-cell-${col.key}`} className={`table-td ${col.className || ''}`}>
                      <div className="table-skeleton-cell" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !hasData ? (
              // Empty state
              <tr className="table-row--empty">
                <td colSpan={columns.length} className="table-td--empty">
                  <div className="table-empty-box">
                    <RiInboxLine className="table-empty-icon" />
                    <p className="table-empty-text">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Render records
              data.map((row, rIdx) => (
                <tr key={row.id || `row-${rIdx}`} className="table-row">
                  {columns.map((col) => (
                    <td
                      key={`${row.id || rIdx}-${col.key}`}
                      style={{ textAlign: col.align || 'left' }}
                      className={`table-td ${col.className || ''}`}
                      data-label={col.title}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && hasData && !loading && (
        <div className="table-pagination">
          <div className="table-pagination-info">
            Showing <span className="table-pagination-bold">{pagination.rangeFrom + 1}</span> to{' '}
            <span className="table-pagination-bold">
              {Math.min(pagination.rangeTo + 1, pagination.total)}
            </span>{' '}
            of <span className="table-pagination-bold">{pagination.total}</span> records
          </div>
          
          <div className="table-pagination-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={pagination.prevPage}
            >
              Previous
            </Button>
            
            <span className="table-pagination-pages">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={pagination.nextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
