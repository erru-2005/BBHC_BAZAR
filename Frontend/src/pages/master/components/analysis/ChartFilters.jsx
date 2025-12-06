/**
 * Chart Filters Component
 * Allows filtering by date range and category
 */
import { useState } from 'react'
import { motion } from 'framer-motion'

const ChartFilters = ({ onFilterChange, categories = [] }) => {
  const [dateRange, setDateRange] = useState('monthly')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customDateRange, setCustomDateRange] = useState(false)

  const handleDateRangeChange = (range) => {
    setDateRange(range)
    setCustomDateRange(false)
    onFilterChange({ period: range, category: selectedCategory })
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    onFilterChange({ period: dateRange, category, startDate, endDate })
  }

  const handleCustomDateRange = () => {
    setCustomDateRange(true)
    if (startDate && endDate) {
      onFilterChange({ 
        period: 'custom', 
        category: selectedCategory, 
        startDate, 
        endDate 
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 mb-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        {/* Date Range Selector */}
        <div className="flex-1 min-w-full sm:min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Period
          </label>
          <div className="flex gap-2 flex-wrap">
            {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
              <button
                key={period}
                onClick={() => handleDateRangeChange(period)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === period && !customDateRange
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="flex-1 min-w-full sm:min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Date Range
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCustomDateRange}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ChartFilters

