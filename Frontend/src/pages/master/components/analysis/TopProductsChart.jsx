/**
 * Top Products Bar Chart Component (Chart.js)
 * Shows top-rated products with thumbnails and rating badges
 */
import { Bar } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { CHART_COLORS, defaultOptions } from '../../../../utils/chartConfig'
import ProductDetailPopup from './ProductDetailPopup'

const TopProductsChart = ({ data, isLoading }) => {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [limit, setLimit] = useState(5)
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
        <p className="text-gray-400">No top products data available</p>
      </div>
    )
  }

  // Take top products based on limit and format data
  const topProducts = data.slice(0, limit).map(item => ({
    product_id: item.product_id || item.id || '',
    name: item.name || item.product || item.product_name || 'Unknown',
    rating: item.rating || 0,
    rating_count: item.rating_count || 0,
    thumbnail: item.thumbnail || '',
    selling_price: item.selling_price || 0,
    specification: item.specification || '',
    seller_name: item.seller_name || 'Unknown',
    quantity: item.quantity || item.stock_quantity || 0
  }))

  // Create labels with thumbnails (we'll show thumbnails separately)
  const labels = topProducts.map((item, index) => `#${index + 1}`)
  const ratingData = topProducts.map(item => item.rating)
  const backgroundColors = topProducts.map((_, index) => 
    CHART_COLORS.primary[index % CHART_COLORS.primary.length]
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Rating',
        data: ratingData,
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
    indexAxis: 'y',
    maintainAspectRatio: false,
    onHover: (event, elements) => {
      event.native.target.style.cursor = 'default' // No pointer cursor on bars
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 0.5,
          callback: function(value) {
            return value.toFixed(1) + ' ⭐'
          }
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
            const item = topProducts[index]
            return item.name
          },
          label: function(context) {
            const index = context.dataIndex
            const item = topProducts[index]
            return [
              `Rating: ${item.rating.toFixed(1)} / 5.0 ⭐`,
              `Reviews: ${item.rating_count}`,
              `Price: ₹${item.selling_price.toLocaleString()}`
            ]
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Top Products by Rating</h3>
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
            </select>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mb-4 px-2">Click on thumbnail to view product details</p>
        
        {/* Chart with thumbnails on the left */}
        <div className="relative" style={{ height: `${Math.max(300, topProducts.length * 60)}px` }}>
          {/* Thumbnails positioned on the left - aligned with bars */}
          <div className="absolute left-0 top-0 h-full z-10 flex flex-col" style={{ width: '70px' }}>
            {topProducts.map((item, index) => {
              // Calculate position to align with chart bars
              const barHeight = 100 / topProducts.length
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
                    {/* Rating Badge - positioned inside top-right corner */}
                    <div className="absolute top-0 right-0 bg-yellow-400 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg" style={{ transform: 'translate(25%, -25%)' }}>
                      {item.rating.toFixed(1)}
                    </div>
                    {/* Position Badge - positioned inside bottom-left corner */}
                    <div className="absolute bottom-0 left-0 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg" style={{ transform: 'translate(-25%, 25%)' }}>
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

export default TopProductsChart
