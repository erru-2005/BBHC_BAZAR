/**
 * Stock/Inventory Levels Bar Chart Component (Chart.js)
 * Shows product thumbnails with quantity badges on the left
 */
import { Bar, getElementAtEvent } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'
import ProductDetailPopup from './ProductDetailPopup'

const StockLevelsChart = ({ data, isLoading }) => {
  const [selectedProduct, setSelectedProduct] = useState(null)
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

  // Sort by stock quantity (ascending) and take top 20
  const sortedData = [...formattedData]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20)

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
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default'
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
            return ['Click to view details']
          }
        }
      }
    }
  }

  const handleChartClick = (event) => {
    if (chartRef.current) {
      const elements = getElementAtEvent(chartRef.current, event)
      if (elements.length > 0) {
        const index = elements[0].index
        setSelectedProduct(sortedData[index])
      }
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden"
      >
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">Stock Levels (Lowest First)</h3>
        
        {/* Product Thumbnails with Quantity Badges */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 sm:gap-3 pb-2">
            {sortedData.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedProduct(item)}
                className="flex-shrink-0 cursor-pointer group relative"
              >
                <div className="relative">
                  <img
                    src={item.thumbnail || 'https://via.placeholder.com/80x80?text=No+Image'}
                    alt={item.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-500 transition-colors"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/80x80?text=No+Image'
                    }}
                  />
                  {/* Quantity Badge */}
                  <div className={`absolute -top-2 -right-2 text-white text-xs font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-lg ${
                    item.stock === 0 ? 'bg-red-500' :
                    item.stock < 10 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}>
                    {item.stock}
                  </div>
                  {/* Position Badge */}
                  <div className="absolute -bottom-1 -left-1 bg-gray-700 text-white text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-lg">
                    #{index + 1}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center max-w-[80px] sm:max-w-[100px] truncate">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mb-2 px-2">Click on any bar or thumbnail to view product details</p>
        <div className="px-2" style={{ height: '400px' }} onClick={handleChartClick}>
          <Bar ref={chartRef} data={chartData} options={options} />
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
