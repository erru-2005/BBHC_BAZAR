/**
 * Summary Section Component
 * Displays key insights and data summary at the end
 */
import { motion } from 'framer-motion'
import { FaChartLine, FaShoppingCart, FaUsers, FaBox, FaRupeeSign, FaStore } from 'react-icons/fa'

const SummarySection = ({ stats, salesByCategory, ordersByStatus, topProducts, salesBySeller, stockLevels }) => {
  // Calculate summary statistics - these should be shown in summary
  const totalOrders = stats?.totalOrders || 0
  const totalRevenue = stats?.totalRevenue || 0
  const totalProducts = stats?.totalProducts || 0
  const totalUsers = stats?.totalUsers || 0
  const totalSellers = stats?.totalSellers || 0
  
  // Calculate order status summary
  const completedOrders = ordersByStatus?.find(o => o.status === 'completed')?.count || 0
  const pendingOrders = ordersByStatus?.find(o => o.status === 'pending')?.count || 0
  const cancelledOrders = ordersByStatus?.find(o => o.status === 'cancelled')?.count || 0
  
  // Calculate top category
  const topCategory = salesByCategory && salesByCategory.length > 0
    ? salesByCategory[0]
    : null
  
  // Calculate top seller
  const topSeller = salesBySeller && salesBySeller.length > 0
    ? salesBySeller[0]
    : null
  
  // Calculate low stock items
  const lowStockItems = stockLevels?.filter(item => {
    const stock = item.stock || item.quantity || 0
    return stock < 10 && stock > 0
  }).length || 0
  
  const outOfStockItems = stockLevels?.filter(item => {
    const stock = item.stock || item.quantity || 0
    return stock === 0
  }).length || 0

  const summaryItems = [
    {
      icon: FaUsers,
      label: 'Total Users',
      value: totalUsers.toLocaleString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: FaStore,
      label: 'Total Sellers',
      value: totalSellers.toLocaleString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: FaShoppingCart,
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: FaBox,
      label: 'Total Products',
      value: totalProducts.toLocaleString(),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      icon: FaRupeeSign,
      label: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ]

  const insights = [
    {
      title: 'Order Status',
      items: [
        { label: 'Completed', value: completedOrders, color: 'text-green-600' },
        { label: 'Pending', value: pendingOrders, color: 'text-yellow-600' },
        { label: 'Cancelled', value: cancelledOrders, color: 'text-red-600' }
      ]
    },
    {
      title: 'Inventory Status',
      items: [
        { label: 'Low Stock Items', value: lowStockItems, color: 'text-orange-600' },
        { label: 'Out of Stock', value: outOfStockItems, color: 'text-red-600' }
      ]
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 sm:p-8 mt-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <FaChartLine className="text-3xl text-blue-600" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Summary</h2>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {summaryItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`${item.bgColor} rounded-lg p-4 text-center`}
          >
            <item.icon className={`${item.color} text-2xl mb-2 mx-auto`} />
            <p className="text-sm font-medium text-gray-600 mb-1">{item.label}</p>
            <p className={`${item.color} text-xl font-bold`}>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            className="bg-white rounded-lg p-5 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">{insight.title}</h3>
            <div className="space-y-3">
              {insight.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`${item.color} font-bold text-lg`}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topCategory && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white rounded-lg p-5 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Category</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{topCategory.category || topCategory.name}</span>
              <span className="text-blue-600 font-bold text-lg">
                ₹{(topCategory.value || topCategory.sales || 0).toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}

        {topSeller && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-white rounded-lg p-5 shadow-md"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Seller</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{topSeller.seller || topSeller.name || 'Unknown'}</span>
                <span className="text-green-600 font-bold text-lg">
                  ₹{(topSeller.sales || topSeller.revenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Orders</span>
                <span>{topSeller.orders || topSeller.count || 0}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default SummarySection

