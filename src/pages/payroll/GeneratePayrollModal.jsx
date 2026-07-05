/**
 * GeneratePayrollModal.jsx
 * ------------------------
 * Modal to trigger a new payroll run (supports month-wise cycle or custom date range).
 */

import { useState } from 'react'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { generatePayrollRun } from '@/services/payrollService'
import { MONTHS } from '@/utils/constants'

export default function GeneratePayrollModal({ isOpen, onClose, onSaveSuccess }) {
  const [mode, setMode] = useState('month') // 'month' | 'range'
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [generating, setGenerating] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setGenerating(true)

    try {
      let finalMonth = Number(month)
      let finalYear = Number(year)
      let finalStart = null
      let finalEnd = null

      if (mode === 'range') {
        if (!startDate || !endDate) {
          toast.error('Please select both start and end dates.')
          setGenerating(false)
          return
        }
        if (dayjs(startDate).isAfter(dayjs(endDate))) {
          toast.error('Start date cannot be after end date.')
          setGenerating(false)
          return
        }
        // Extract month/year from start date
        const startDay = dayjs(startDate)
        finalMonth = startDay.month() + 1
        finalYear = startDay.year()
        finalStart = startDate
        finalEnd = endDate
      }

      const { error } = await generatePayrollRun(finalMonth, finalYear, finalStart, finalEnd)

      if (error) {
        toast.error(`Generation failed: ${error.message || 'Check if cycle already exists.'}`)
      } else {
        const msg = mode === 'month' 
          ? `Successfully processed payroll for ${finalMonth}/${finalYear}`
          : `Successfully processed payroll from ${dayjs(startDate).format('DD MMM YYYY')} to ${dayjs(endDate).format('DD MMM YYYY')}`
        toast.success(msg)
        onSaveSuccess()
        onClose()
      }
    } catch (err) {
      toast.error('An unexpected error occurred: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const monthOptions = MONTHS.map(m => ({ value: m.value, label: m.label }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payroll Run" size="sm">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        
        {/* Preference / Mode Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Payroll Period Preference
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              <input 
                type="radio" 
                name="calcMode" 
                value="month" 
                checked={mode === 'month'} 
                onChange={() => setMode('month')} 
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Month-wise
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              <input 
                type="radio" 
                name="calcMode" 
                value="range" 
                checked={mode === 'range'} 
                onChange={() => setMode('range')} 
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Date Range
            </label>
          </div>
        </div>

        {/* Month-wise inputs */}
        {mode === 'month' && (
          <>
            <Input
              type="select"
              label="Select Payroll Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={monthOptions}
            />

            <Input
              type="number"
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2100"
              required
            />
          </>
        )}

        {/* Date Range inputs */}
        {mode === 'range' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button type="submit" loading={generating}>
            Process Salaries
          </Button>
        </div>

      </form>
    </Modal>
  )
}
