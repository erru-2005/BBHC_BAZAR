/**
 * Orders by Status Bar Chart Component (Chart.js)
 */
import { Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const OrdersByStatusChart = ({ data, isLoading }) => {
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
        <p className="text-gray-400">No order status data available</p>
      </div>
    )
  }

  // Format data for Chart.js
  const formattedData = data.map(item => ({
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    count: item.count || item.orders || 0
  }))

  const labels = formattedData.map(item => item.status)
  const counts = formattedData.map(item => item.count)
  const backgroundColors = formattedData.map(item => 
    CHART_COLORS.status[item.status.toLowerCase()] || CHART_COLORS.primary[0]
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Orders',
        data: counts,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  }

  const options = {
    ...defaultOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
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
            return `Orders: ${context.parsed.y}`
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
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">Orders by Status</h3>
      <div className="px-2" style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default OrdersByStatusChart
