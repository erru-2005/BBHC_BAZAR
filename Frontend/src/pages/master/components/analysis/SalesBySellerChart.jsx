/**
 * Sales by Seller Bar Chart Component (Chart.js)
 */
import { Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const SalesBySellerChart = ({ data, isLoading }) => {
  const [limit, setLimit] = useState(10) // Default show top 10 sellers

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
        <p className="text-gray-400">No seller data available</p>
      </div>
    )
  }

  // Format data for Chart.js and limit results
  const formattedData = data.slice(0, limit).map(item => ({
    seller: item.seller || item.name || 'Unknown',
    sales: item.sales || item.revenue || item.totalSales || 0,
    orders: item.orders || item.count || 0
  }))

  const labels = formattedData.map(item => item.seller)
  const salesData = formattedData.map(item => item.sales)
  const backgroundColors = formattedData.map((_, index) => 
    CHART_COLORS.primary[index % CHART_COLORS.primary.length]
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sales (₹)',
        data: salesData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  }

  const options = {
    ...defaultOptions,
    maintainAspectRatio: false,
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
        ticks: {
          maxRotation: 45,
          minRotation: 45
        },
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
            const index = context.dataIndex
            const seller = formattedData[index]
            return [
              `Sales: ₹${context.parsed.y.toLocaleString()}`,
              `Orders: ${seller.orders}`
            ]
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
      className="bg-white rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 px-2">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sales by Seller</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-gray-600">Show:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={data.length}>All ({data.length})</option>
          </select>
        </div>
      </div>
      <div className="px-2" style={{ height: `${Math.max(350, formattedData.length * 40)}px` }}>
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default SalesBySellerChart
