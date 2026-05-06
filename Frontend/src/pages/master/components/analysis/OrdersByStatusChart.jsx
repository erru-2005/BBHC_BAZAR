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

  // Define logical sequence and labels for statuses
  const STATUS_CONFIG = {
    'pending_seller': { label: 'New Order', color: CHART_COLORS.status.pending || '#f39c12' },
    'seller_accepted': { label: 'Seller Accepted', color: CHART_COLORS.status.accepted || '#3498db' },
    'handed_over': { label: 'At Outlet', color: CHART_COLORS.status.handed_over || '#9b59b6' },
    'completed': { label: 'Completed', color: CHART_COLORS.status.completed || '#2ecc71' },
    'seller_rejected': { label: 'Rejected', color: CHART_COLORS.status.rejected || '#e74c3c' },
    'cancelled': { label: 'Cancelled', color: CHART_COLORS.status.cancelled || '#7f8c8d' },
    'cancelled_master': { label: 'Master Cancelled', color: CHART_COLORS.status.cancelled_master || '#c0392b' }
  }

  // Filter and sort based on predefined sequence
  const orderedStatuses = [
    'pending_seller', 'seller_accepted', 'handed_over',
    'completed', 'seller_rejected', 'cancelled', 'cancelled_master'
  ]

  const chartLabels = []
  const chartCounts = []
  const chartColors = []

  orderedStatuses.forEach(statusKey => {
    const item = data.find(d => d.status === statusKey)
    const config = STATUS_CONFIG[statusKey]

    // Only show if it has a count OR it's a primary workflow status
    const count = item ? (item.count || item.orders || 0) : 0

    chartLabels.push(config.label)
    chartCounts.push(count)
    chartColors.push(config.color)
  })

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Orders',
        data: chartCounts,
        backgroundColor: chartColors,
        borderColor: chartColors,
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
          label: function (context) {
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
