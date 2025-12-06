/**
 * Revenue vs Commissions Dual Chart Component (Chart.js)
 */
import { Line, Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const RevenueVsCommissionsChart = ({ data, isLoading, chartType = 'line' }) => {
  const [currentChartType, setCurrentChartType] = useState(chartType)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-96 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-96 flex items-center justify-center">
        <p className="text-gray-400">No revenue data available</p>
      </div>
    )
  }

  // Format data for Chart.js
  const formattedData = data.map(item => ({
    date: item.date || item.period || 'Unknown',
    revenue: item.revenue || item.totalRevenue || 0,
    commissions: item.commissions || item.totalCommissions || 0
  }))

  const labels = formattedData.map(item => item.date)
  const revenueData = formattedData.map(item => item.revenue)
  const commissionsData = formattedData.map(item => item.commissions)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue (₹)',
        data: revenueData,
        borderColor: '#10B981',
        backgroundColor: currentChartType === 'bar' ? '#10B981' : 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: currentChartType === 'line',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Commissions (₹)',
        data: commissionsData,
        borderColor: '#F59E0B',
        backgroundColor: currentChartType === 'bar' ? '#F59E0B' : 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: currentChartType === 'line',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#F59E0B',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  }

  const options = {
    ...defaultOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + (value / 1000).toFixed(0) + 'k'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`
          }
        }
      }
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg p-6 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Revenue vs Commissions</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentChartType('line')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentChartType === 'line'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setCurrentChartType('bar')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentChartType === 'bar'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bar
          </button>
        </div>
      </div>
      <div className="px-2" style={{ height: '300px' }}>
        {currentChartType === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </motion.div>
  )
}

export default RevenueVsCommissionsChart
