/**
 * Sales Trend Line Chart Component (Chart.js)
 */
import { Line } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const SalesTrendChart = ({ data, period, isLoading }) => {
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
        <p className="text-gray-400">No sales trend data available</p>
      </div>
    )
  }

  // Format data for Chart.js
  const formattedData = data.map(item => ({
    date: item.date || item.period || 'Unknown',
    sales: item.sales || item.revenue || item.value || 0
  }))

  const labels = formattedData.map(item => item.date)
  const salesData = formattedData.map(item => item.sales)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sales (₹)',
        data: salesData,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#8B5CF6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#EC4899',
        pointHoverBorderColor: '#ffffff'
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
            return `Sales: ₹${context.parsed.y.toLocaleString()}`
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
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">
        Sales Trend ({period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'})
      </h3>
      <div className="px-2" style={{ height: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default SalesTrendChart
