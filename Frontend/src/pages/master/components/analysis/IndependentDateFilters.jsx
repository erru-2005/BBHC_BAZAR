/**
 * Independent Date Filters Component
 * Provides separate controls for date range and single date with validation.
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCalendar, FiChevronDown, FiAlertCircle } from 'react-icons/fi'

const IndependentDateFilters = ({ onFilterChange, title }) => {
  const [filterMode, setFilterMode] = useState('range') // 'range' or 'single'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [singleDate, setSingleDate] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const validateAndSubmit = () => {
    setError('')
    
    if (filterMode === 'range') {
      if (!startDate || !endDate) {
        setError('Please select both start and end dates')
        return
      }
      if (startDate > today || endDate > today) {
        setError('Future dates are not allowed')
        return
      }
      if (startDate > endDate) {
        setError('Start date cannot be after end date')
        return
      }
      onFilterChange({
        period: 'custom',
        startDate,
        endDate
      })
    } else {
      if (!singleDate) {
        setError('Please select a date')
        return
      }
      if (singleDate > today) {
        setError('Future dates are not allowed')
        return
      }
      onFilterChange({
        period: 'custom',
        startDate: singleDate,
        endDate: singleDate
      })
    }
    setIsOpen(false)
  }

  // Handle mode change
  useEffect(() => {
    setError('')
  }, [filterMode])

  return (
    <div className="relative mb-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title} Filter</h4>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiCalendar className="w-3.5 h-3.5 text-blue-500" />
          {filterMode === 'range' ? 'Date Range' : 'Single Date'}
          <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on click outside */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 top-full mt-2 z-20 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4"
            >
              <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-lg">
                <button
                  onClick={() => setFilterMode('range')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterMode === 'range' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Range
                </button>
                <button
                  onClick={() => setFilterMode('single')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterMode === 'single' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Single Day
                </button>
              </div>

              <div className="space-y-3">
                {filterMode === 'range' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          max={today}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">End Date</label>
                        <input
                          type="date"
                          max={today}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Select Date</label>
                    <input
                      type="date"
                      max={today}
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg text-xs">
                    <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={validateAndSubmit}
                  className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-100"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default IndependentDateFilters
