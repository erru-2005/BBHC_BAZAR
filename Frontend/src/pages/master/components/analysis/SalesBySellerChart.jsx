/**
 * Sales by Seller Bar Chart Component (Chart.js)
 */
import { Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'

const SalesBySellerChart = ({ data, isLoading }) => {
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

  // Format data for Chart.js
  const formattedData = data.map(item => ({
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
      className="bg-white rounded-xl shadow-lg p-6 overflow-hidden"
    >
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">Sales by Seller</h3>
      <div className="px-2" style={{ height: '350px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  )
}

export default SalesBySellerChart
