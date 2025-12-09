/**
 * Stock/Inventory Levels Bar Chart Component (Chart.js)
 * Shows product thumbnails with quantity badges on the left
 */
import { Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'
import ProductDetailPopup from './ProductDetailPopup'

const StockLevelsChart = ({ data, isLoading }) => {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [limit, setLimit] = useState(20) // Default show top 20 products
  const chartRef = useRef(null)

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
        <p className="text-gray-400">No stock data available</p>
      </div>
    )
  }

  // Format and sort data
  const formattedData = data.map(item => ({
    product_id: item.product_id || item.id || item._id || '',
    name: item.product || item.name || item.product_name || 'Unknown Product',
    stock: item.stock || item.quantity || item.stock_quantity || item.inventory || 0,
    seller_name: item.seller_name || item.seller || 'Unknown',
    specification: item.specification || '',
    selling_price: item.selling_price || 0,
    thumbnail: item.thumbnail || ''
  }))

  // Sort by stock quantity (ascending) and take based on limit
  const sortedData = [...formattedData]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit)

  // Create labels (we'll show thumbnails separately, so use simple labels)
  const labels = sortedData.map((_, index) => `#${index + 1}`)
  const stockData = sortedData.map(item => item.stock)
  const backgroundColors = sortedData.map(item => {
    if (item.stock === 0) return '#EF4444' // Red for out of stock
    if (item.stock < 10) return '#F59E0B' // Orange for low stock
    return '#10B981' // Green for good stock
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Stock Quantity',
        data: stockData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 2,
        borderRadius: 8
      }
    ]
  }

  const options = {
    ...defaultOptions,
    indexAxis: 'y',
    maintainAspectRatio: false,
    onHover: (event, elements) => {
      event.native.target.style.cursor = 'default' // No pointer cursor on bars
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          display: false // Hide default labels since we're showing thumbnails
        },
        afterFit: function(scale) {
          scale.width = 0; // Remove y-axis width to save space
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex
            const item = sortedData[index]
            return item.name
          },
          label: function(context) {
            const stock = context.parsed.x
            let status = ''
            if (stock === 0) status = ' ⚠️ Out of Stock'
            else if (stock < 10) status = ' ⚠️ Low Stock'
            return `Stock: ${stock} units${status}`
          },
          afterBody: function(context) {
            return ['Click thumbnail to view details']
          }
        }
      }
    }
  }

  // Removed handleChartClick - only thumbnails are clickable now

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 px-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Stock Levels (Lowest First)</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">Show:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={formattedData.length}>All ({formattedData.length})</option>
            </select>
          </div>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-500 mb-4 px-2">Click on thumbnail to view product details</p>
        
        {/* Chart with thumbnails on the left */}
        <div className="relative" style={{ height: `${Math.max(400, sortedData.length * 60)}px` }}>
          {/* Thumbnails positioned on the left - aligned with bars */}
          <div className="absolute left-0 top-0 h-full z-10 flex flex-col" style={{ width: '70px' }}>
            {sortedData.map((item, index) => {
              // Calculate position to align with chart bars
              const barHeight = 100 / sortedData.length
              const topPosition = `${(index * barHeight) + (barHeight / 2) - 2.5}%`
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedProduct(item)}
                  className="absolute cursor-pointer group"
                  style={{ 
                    top: topPosition,
                    transform: 'translateY(-50%)',
                    width: '60px',
                    height: '50px'
                  }}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={item.thumbnail || 'https://via.placeholder.com/50x50?text=No+Image'}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-500 transition-colors"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/50x50?text=No+Image'
                      }}
                    />
                    {/* Quantity Badge - positioned inside top-right corner */}
                    <div className={`absolute top-0 right-0 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg ${
                      item.stock === 0 ? 'bg-red-500' :
                      item.stock < 10 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`} style={{ transform: 'translate(25%, -25%)' }}>
                      {item.stock}
                    </div>
                    {/* Position Badge - positioned inside bottom-left corner */}
                    <div className="absolute bottom-0 left-0 bg-gray-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg" style={{ transform: 'translate(-25%, 25%)' }}>
                      #{index + 1}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Chart positioned with left margin for thumbnails - NO click handler */}
          <div className="ml-20 pr-2" style={{ height: '100%' }}>
            <Bar ref={chartRef} data={chartData} options={options} />
          </div>
        </div>
      </motion.div>

      {/* Product Details Popup */}
      {selectedProduct && (
        <ProductDetailPopup
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  )
}

export default StockLevelsChart
