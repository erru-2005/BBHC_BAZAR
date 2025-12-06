/**
 * Returning vs New Customers Pie Chart Component (Chart.js)
 */
import { Pie } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const ReturningVsNewChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-96 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-96 flex items-center justify-center">
        <p className="text-gray-400">No customer data available</p>
      </div>
    )
  }

  const newCount = data.new || data.newCustomers || 0
  const returningCount = data.returning || data.returningCustomers || 0
  const total = newCount + returningCount

  const chartData = {
    labels: ['New Customers', 'Returning Customers'],
    datasets: [
      {
        label: 'Customers',
        data: [newCount, returningCount],
        backgroundColor: ['#3B82F6', '#10B981'],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }

  const options = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value.toLocaleString()} (${percentage}%)`
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
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">Returning vs New Customers</h3>
      <div className="px-2" style={{ height: '300px' }}>
        <Pie data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default ReturningVsNewChart
