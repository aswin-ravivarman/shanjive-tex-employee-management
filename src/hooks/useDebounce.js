/**
 * useDebounce.js
 * --------------
 * Returns a debounced version of the input value.
 * The debounced value only updates after the specified delay
 * has elapsed without the value changing.
 *
 * Primary use case: delay search/filter API calls while the
 * user is still typing in a search box.
 *
 * @example
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebounce(query, 400)
 *
 * useEffect(() => {
 *   // Only fires 400ms after the user stops typing
 *   fetchEmployees({ search: debouncedQuery })
 * }, [debouncedQuery])
 */

import { useState, useEffect } from 'react'

/**
 * @param {any} value — the value to debounce
 * @param {number} delay — debounce delay in milliseconds (default: 400ms)
 * @returns {any} — the debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cancel the timer if value changes before the delay expires
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
