/**
 * Sales by Category Pie Chart Component (Chart.js)
 */
import { Pie } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const SalesByCategoryChart = ({ data, isLoading }) => {
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
        <p className="text-gray-400">No sales data available by category</p>
      </div>
    )
  }

  // Format data for Chart.js
  const labels = data.map(item => item.category || item.name || 'Unknown')
  const values = data.map(item => item.value || item.sales || item.revenue || 0)
  const total = values.reduce((sum, val) => sum + val, 0)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sales (₹)',
        data: values,
        backgroundColor: CHART_COLORS.primary,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }

  const options = {
    ...defaultOptions,
    cutout: '60%', // Make it a donut chart
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value} orders (${percentage}%)`
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
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">Sales by Category</h3>
      <div className="px-2" style={{ height: '300px' }}>
        <Pie data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default SalesByCategoryChart
