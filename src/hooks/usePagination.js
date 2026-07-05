/**
 * usePagination.js
 * ----------------
 * Manages all pagination state for a paginated data list.
 * Works with the service layer's standard paginated response:
 *   { data: [...], count: totalRows, error: null }
 *
 * @example
 * const pagination = usePagination()
 *
 * // Pass current params to service
 * const { data, count } = await getEmployees({
 *   page:     pagination.page,
 *   pageSize: pagination.pageSize,
 * })
 *
 * // After fetch, sync total count
 * pagination.setTotal(count)
 *
 * // Render <Pagination> component
 * <Pagination
 *   page={pagination.page}
 *   pageSize={pagination.pageSize}
 *   total={pagination.total}
 *   totalPages={pagination.totalPages}
 *   onPageChange={pagination.setPage}
 *   onPageSizeChange={pagination.setPageSize}
 * />
 */

import { useState, useCallback } from 'react'
import { PAGINATION } from '@/utils/constants'

/**
 * @param {object} options
 * @param {number} options.defaultPage — initial page (default: 1)
 * @param {number} options.defaultPageSize — initial page size (default: 20)
 * @returns {object} pagination state and controls
 */
export function usePagination({
  defaultPage     = PAGINATION.DEFAULT_PAGE,
  defaultPageSize = PAGINATION.DEFAULT_PAGE_SIZE,
} = {}) {
  const [page, setPageInternal]     = useState(defaultPage)
  const [pageSize, setPageSizeInternal] = useState(defaultPageSize)
  const [total, setTotal]           = useState(0)

  /** Total number of pages given current total and pageSize. */
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  /** Whether a previous page exists. */
  const hasPrev = page > 1

  /** Whether a next page exists. */
  const hasNext = page < totalPages

  /** Change to a specific page (clamped to valid range). */
  const setPage = useCallback((newPage) => {
    const clamped = Math.max(1, Math.min(newPage, Math.ceil(total / pageSize) || 1))
    setPageInternal(clamped)
  }, [total, pageSize])

  /** Change page size and reset to page 1. */
  const setPageSize = useCallback((newSize) => {
    setPageSizeInternal(newSize)
    setPageInternal(1)
  }, [])

  /** Navigate to the previous page. */
  const prevPage = useCallback(() => {
    setPage(page - 1)
  }, [page, setPage])

  /** Navigate to the next page. */
  const nextPage = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  /** Reset pagination to defaults (e.g. when filters change). */
  const reset = useCallback(() => {
    setPageInternal(defaultPage)
    setTotal(0)
  }, [defaultPage])

  /**
   * Calculated offset for Supabase range queries.
   * Supabase uses 0-based range: .range(from, to)
   */
  const offset = (page - 1) * pageSize
  const rangeFrom = offset
  const rangeTo = offset + pageSize - 1

  return {
    // State
    page,
    pageSize,
    total,
    totalPages,
    hasPrev,
    hasNext,
    offset,
    rangeFrom,
    rangeTo,
    // Setters
    setPage,
    setPageSize,
    setTotal,
    prevPage,
    nextPage,
    reset,
  }
}
