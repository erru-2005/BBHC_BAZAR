/**
 * Main Analysis Component
 * Combines all charts with real-time updates
 */
import { useState, useEffect, useCallback } from 'react'
import { getSocket, initSocket } from '../../../../utils/socket'
// Import Chart.js config to register components
import '../../../../utils/chartConfig'
import {
  getAnalyticsStats,
  getSalesByCategory,
  getOrdersByStatus,
  getRevenueVsCommissions,
  getReturningVsNew,
  getStockLevels,
  getTopProducts,
  getSalesBySeller,
  getCategories,
  getSellers,
  getOrders,
  getProducts,
  getActiveCounts
} from '../../../../services/api'
import SalesByCategoryChart from './SalesByCategoryChart'
import OrdersByStatusChart from './OrdersByStatusChart'
import RevenueVsCommissionsChart from './RevenueVsCommissionsChart'
import ReturningVsNewChart from './ReturningVsNewChart'
import StockLevelsChart from './StockLevelsChart'
import TopProductsChart from './TopProductsChart'
import SalesBySellerChart from './SalesBySellerChart'
import ChartFilters from './ChartFilters'
import SummarySection from './SummarySection'
import { motion } from 'framer-motion'

const Analysis = () => {
  const [stats, setStats] = useState(null)
  const [salesByCategory, setSalesByCategory] = useState([])
  const [ordersByStatus, setOrdersByStatus] = useState([])
  const [revenueVsCommissions, setRevenueVsCommissions] = useState([])
  const [returningVsNew, setReturningVsNew] = useState(null)
  const [stockLevels, setStockLevels] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [salesBySeller, setSalesBySeller] = useState([])
  const [categories, setCategories] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ period: 'monthly', category: 'all' })

  // Compute analytics from raw data
  const computeAnalyticsFromData = (orders, sellers, products, categories) => {
    // Compute stats
    // Get unique user IDs from orders
    const userIds = new Set()
    orders.forEach(order => {
      const userId = order.user_id || order.userId || order.user?.id
      if (userId) userIds.add(userId)
    })
    const totalUsers = userIds.size
    
    // Active users/sellers are tracked via socket, not computed from data
    // They will be set separately via socket events
    
    const totalSellers = sellers.length

    // Sales by category
    const categorySales = {}
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const category = item.product?.category || item.category || 'Uncategorized'
          const total = item.price * item.quantity
          categorySales[category] = (categorySales[category] || 0) + total
        })
      }
    })
    const salesByCategoryData = Object.entries(categorySales).map(([name, value]) => ({
      name,
      value
    }))

    // Orders by status
    const statusCounts = {}
    orders.forEach(order => {
      const status = order.status || 'pending'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    const ordersByStatusData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }))

    // Stock levels
    const stockData = products
      .map(p => ({
        name: p.name || p.title || 'Unknown',
        stock: p.stock || p.quantity || 0
      }))
      .filter(p => p.stock !== undefined)

    // Top products
    const productSales = {}
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.product?.name || item.name || 'Unknown'
          const sales = item.price * item.quantity
          productSales[productName] = {
            name: productName,
            sales: (productSales[productName]?.sales || 0) + sales,
            orders: (productSales[productName]?.orders || 0) + 1
          }
        })
      }
    })
    const topProductsData = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)

    return {
      stats: { 
        totalUsers, 
        totalSellers,
        // activeUsers and activeSellers are tracked via socket, not computed
      },
      salesByCategory: salesByCategoryData,
      ordersByStatus: ordersByStatusData,
      stockLevels: stockData,
      topProducts: topProductsData
    }
  }

  // Fetch all analytics data
  const fetchAnalyticsData = useCallback(async (filterParams = {}) => {
    try {
      setIsLoading(true)
      
      const params = {
        period: filterParams.period || filters.period,
        category: filterParams.category !== 'all' ? filterParams.category : undefined,
        startDate: filterParams.startDate,
        endDate: filterParams.endDate
      }

      // Try to fetch from analytics endpoints, fallback to computing from raw data
      try {
        const [
          statsData,
          salesCategoryData,
          ordersStatusData,
          revenueCommissionsData,
          returningNewData,
          stockData,
          topProductsData,
          salesSellerData,
          categoriesData
        ] = await Promise.all([
          getAnalyticsStats().catch(() => null),
          getSalesByCategory(params).catch(() => null),
          getOrdersByStatus(params).catch(() => null),
          getRevenueVsCommissions(params).catch(() => []),
          getReturningVsNew(params).catch(() => null),
          getStockLevels(params).catch(() => null),
            getTopProducts({ ...params, sort_by: 'rating', limit: 5 }).catch(() => null),
          getSalesBySeller(params).catch(() => []),
          getCategories().catch(() => [])
        ])

        // If analytics endpoints don't exist, compute from raw data
        if (!statsData || !salesCategoryData || !ordersStatusData || !stockData || !topProductsData) {
          const [orders, sellers, products, categories] = await Promise.all([
            getOrders().catch(() => []),
            getSellers().catch(() => []),
            getProducts().catch(() => []),
            getCategories().catch(() => [])
          ])

          const computed = computeAnalyticsFromData(orders, sellers, products, categories)
          
          // Merge stats but preserve activeUsers/activeSellers from socket
          if (!statsData) {
            setStats(prev => ({
              ...computed.stats,
              activeUsers: prev?.activeUsers ?? computed.stats.activeUsers ?? 0,
              activeSellers: prev?.activeSellers ?? computed.stats.activeSellers ?? 0
            }))
          } else {
            // Merge backend stats with socket-tracked active counts
            setStats(prev => ({
              ...statsData,
              activeUsers: prev?.activeUsers ?? statsData.activeUsers ?? 0,
              activeSellers: prev?.activeSellers ?? statsData.activeSellers ?? 0
            }))
          }
          
          if (!salesCategoryData) setSalesByCategory(computed.salesByCategory)
          if (!ordersStatusData) setOrdersByStatus(computed.ordersByStatus)
          if (!stockData) setStockLevels(computed.stockLevels)
          if (!topProductsData) setTopProducts(computed.topProducts)
          
        } else {
          // Backend provided all data, merge with socket-tracked active counts
          if (statsData) {
            setStats(prev => ({
              ...statsData,
              activeUsers: prev?.activeUsers ?? statsData.activeUsers ?? 0,
              activeSellers: prev?.activeSellers ?? statsData.activeSellers ?? 0
            }))
          }
          if (salesCategoryData) setSalesByCategory(Array.isArray(salesCategoryData) ? salesCategoryData : [])
          if (ordersStatusData) setOrdersByStatus(Array.isArray(ordersStatusData) ? ordersStatusData : [])
          if (stockData) setStockLevels(Array.isArray(stockData) ? stockData : [])
          if (topProductsData) setTopProducts(Array.isArray(topProductsData) ? topProductsData : [])
          
        }

        // Set chart data, ensuring arrays
        setRevenueVsCommissions(Array.isArray(revenueCommissionsData) ? revenueCommissionsData : [])
        setReturningVsNew(returningNewData)
        setSalesBySeller(Array.isArray(salesSellerData) ? salesSellerData : [])
        setCategories(categoriesData.map(cat => cat.name || cat).filter(Boolean))
        
      } catch (error) {
        // Fallback: compute from raw data
        const [orders, sellers, products, categories] = await Promise.all([
          getOrders().catch(() => []),
          getSellers().catch(() => []),
          getProducts().catch(() => []),
          getCategories().catch(() => [])
        ])

        const computed = computeAnalyticsFromData(orders, sellers, products, categories)
        // Preserve active counts from socket
        setStats(prev => ({
          ...computed.stats,
          activeUsers: prev?.activeUsers ?? computed.stats.activeUsers ?? 0,
          activeSellers: prev?.activeSellers ?? computed.stats.activeSellers ?? 0
        }))
        setSalesByCategory(computed.salesByCategory)
        setOrdersByStatus(computed.ordersByStatus)
        setStockLevels(computed.stockLevels)
        setTopProducts(computed.topProducts)
        setCategories(categories.map(cat => cat.name || cat).filter(Boolean))
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Initial data fetch only if socket is not available (fallback)
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !socket.connected) {
      // Fallback to HTTP if socket not available
      fetchAnalyticsData()
    }
  }, [])

  // Set up real-time updates via socket
  useEffect(() => {
    // Initialize socket with token if not already connected
    const token = localStorage.getItem('token')
    if (token) {
      initSocket(token)
    }
    
    const socket = getSocket()
    
    if (!socket) {
      console.warn('Socket not initialized')
      // Fallback to HTTP if socket not available
      fetchAnalyticsData()
      return
    }

    // Wait for socket connection
    const setupSocketListeners = () => {
      if (!socket.connected) {
        socket.once('connect', setupSocketListeners)
        return
      }

      // Request initial analytics data via socket
      socket.emit('analytics:request-data', { period: filters.period }, (response) => {
        if (response && response.success) {
          const data = response.data
          if (data.stats) {
            setStats(prev => ({
              ...data.stats,
              activeUsers: data.stats.activeUsers ?? prev?.activeUsers ?? 0,
              activeSellers: data.stats.activeSellers ?? prev?.activeSellers ?? 0
            }))
          }
          if (data.salesByCategory) setSalesByCategory(Array.isArray(data.salesByCategory) ? data.salesByCategory : [])
          if (data.ordersByStatus) setOrdersByStatus(Array.isArray(data.ordersByStatus) ? data.ordersByStatus : [])
          if (data.revenueVsCommissions) setRevenueVsCommissions(Array.isArray(data.revenueVsCommissions) ? data.revenueVsCommissions : [])
          if (data.returningVsNew) setReturningVsNew(data.returningVsNew)
          if (data.stockLevels) setStockLevels(Array.isArray(data.stockLevels) ? data.stockLevels : [])
          if (data.topProducts) setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : [])
          if (data.salesBySeller) setSalesBySeller(Array.isArray(data.salesBySeller) ? data.salesBySeller : [])
          setIsLoading(false)
        }
      })

      // Also listen for analytics:data event (response from backend)
      const handleAnalyticsData = (response) => {
        if (response && response.success) {
          const data = response.data
          if (data.stats) {
            setStats(prev => ({
              ...data.stats,
              activeUsers: data.stats.activeUsers ?? prev?.activeUsers ?? 0,
              activeSellers: data.stats.activeSellers ?? prev?.activeSellers ?? 0
            }))
          }
          if (data.salesByCategory) setSalesByCategory(Array.isArray(data.salesByCategory) ? data.salesByCategory : [])
          if (data.ordersByStatus) setOrdersByStatus(Array.isArray(data.ordersByStatus) ? data.ordersByStatus : [])
          if (data.revenueVsCommissions) setRevenueVsCommissions(Array.isArray(data.revenueVsCommissions) ? data.revenueVsCommissions : [])
          if (data.returningVsNew) setReturningVsNew(data.returningVsNew)
          if (data.stockLevels) setStockLevels(Array.isArray(data.stockLevels) ? data.stockLevels : [])
          if (data.topProducts) setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : [])
          if (data.salesBySeller) setSalesBySeller(Array.isArray(data.salesBySeller) ? data.salesBySeller : [])
          setIsLoading(false)
        }
      }
      
      socket.on('analytics:data', handleAnalyticsData)

      // Listen for active users (users with socket connection)
      const handleUserConnected = (data) => {
        // When a user connects via socket, increment active user count
        if (data.user_id) {
          setStats(prev => ({
            ...prev,
            activeUsers: (prev?.activeUsers || 0) + 1
          }))
        }
      }

      const handleUserDisconnected = (data) => {
        // When a user disconnects, decrement active user count
        if (data.user_id) {
          setStats(prev => ({
            ...prev,
            activeUsers: Math.max(0, (prev?.activeUsers || 0) - 1)
          }))
        }
      }

      // Listen for home visits (for analytics tracking, not active count)
      const handleUserHomeVisit = (data) => {
        // This is tracked separately for analytics
        // Active count is based on socket connection, not route
      }

      const handleUserHomeLeave = (data) => {
        // User left home route, but socket might still be connected
        // Active count is based on socket connection, not route
      }

      // Listen for active sellers (sellers connected via socket)
      const handleSellerConnected = (data) => {
        setStats(prev => ({
          ...prev,
          activeSellers: (prev?.activeSellers || 0) + 1
        }))
      }

      const handleSellerDisconnected = (data) => {
        setStats(prev => ({
          ...prev,
          activeSellers: Math.max(0, (prev?.activeSellers || 0) - 1)
        }))
      }

      // Listen for analytics updates from backend
      const handleAnalyticsUpdate = (data) => {
        if (data.stats) {
          setStats(prev => ({
            ...prev,
            ...data.stats,
            activeUsers: data.stats.activeUsers !== undefined 
              ? data.stats.activeUsers 
              : prev?.activeUsers,
            activeSellers: data.stats.activeSellers !== undefined 
              ? data.stats.activeSellers 
              : prev?.activeSellers
          }))
        }
        if (data.salesByCategory) setSalesByCategory(Array.isArray(data.salesByCategory) ? data.salesByCategory : [])
        if (data.ordersByStatus) setOrdersByStatus(Array.isArray(data.ordersByStatus) ? data.ordersByStatus : [])
        if (data.stockLevels) setStockLevels(Array.isArray(data.stockLevels) ? data.stockLevels : [])
        if (data.topProducts) setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : [])
        if (data.salesTrend) setSalesTrend(Array.isArray(data.salesTrend) ? data.salesTrend : [])
        if (data.revenueVsCommissions) setRevenueVsCommissions(Array.isArray(data.revenueVsCommissions) ? data.revenueVsCommissions : [])
        if (data.returningVsNew) setReturningVsNew(data.returningVsNew)
        if (data.salesBySeller) setSalesBySeller(Array.isArray(data.salesBySeller) ? data.salesBySeller : [])
        
        // Print analytics:update event data
      }

      // Socket event listeners
      socket.on('user:connected', handleUserConnected) // User connected via socket
      socket.on('user:disconnected', handleUserDisconnected) // User disconnected
      socket.on('user:home-visit', handleUserHomeVisit) // User visiting home (for analytics)
      socket.on('user:home-leave', handleUserHomeLeave) // User left home (for analytics)
      socket.on('seller:connected', handleSellerConnected) // Seller connected via socket
      socket.on('seller:disconnected', handleSellerDisconnected) // Seller disconnected
      socket.on('analytics:update', handleAnalyticsUpdate)
      socket.on('analytics:stats-update', handleAnalyticsUpdate)
      socket.on('order:new', () => {
        // Request updated analytics when new order comes in
        socket.emit('analytics:request-data', { period: filters.period })
      })
      socket.on('order:updated', () => {
        socket.emit('analytics:request-data', { period: filters.period })
      })

      // Cleanup function
      return () => {
        socket.off('user:connected', handleUserConnected)
        socket.off('user:disconnected', handleUserDisconnected)
        socket.off('user:home-visit', handleUserHomeVisit)
        socket.off('user:home-leave', handleUserHomeLeave)
        socket.off('seller:connected', handleSellerConnected)
        socket.off('seller:disconnected', handleSellerDisconnected)
        socket.off('analytics:update', handleAnalyticsUpdate)
        socket.off('analytics:stats-update', handleAnalyticsUpdate)
        socket.off('analytics:data', handleAnalyticsData)
        socket.off('order:new')
        socket.off('order:updated')
      }
    }

    setupSocketListeners()

    return () => {
      // Cleanup is handled in setupSocketListeners
    }
  }, [filters.period])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    const socket = getSocket()
    if (socket && socket.connected) {
      // Request data via socket with new filters
      socket.emit('analytics:request-data', { period: newFilters.period }, (response) => {
        if (response && response.success) {
          const data = response.data
          if (data.salesByCategory) setSalesByCategory(Array.isArray(data.salesByCategory) ? data.salesByCategory : [])
          if (data.ordersByStatus) setOrdersByStatus(Array.isArray(data.ordersByStatus) ? data.ordersByStatus : [])
          if (data.revenueVsCommissions) setRevenueVsCommissions(Array.isArray(data.revenueVsCommissions) ? data.revenueVsCommissions : [])
          if (data.returningVsNew) setReturningVsNew(data.returningVsNew)
          if (data.stockLevels) setStockLevels(Array.isArray(data.stockLevels) ? data.stockLevels : [])
          if (data.topProducts) setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : [])
          if (data.salesBySeller) setSalesBySeller(Array.isArray(data.salesBySeller) ? data.salesBySeller : [])
        }
      })
    } else {
      // Fallback to HTTP
      fetchAnalyticsData(newFilters)
    }
  }

  return (
    <div className="space-y-6">

      {/* Filters */}
      <ChartFilters 
        onFilterChange={handleFilterChange} 
        categories={categories}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <SalesByCategoryChart data={salesByCategory} isLoading={isLoading} />


        {/* Orders by Status */}
        <OrdersByStatusChart data={ordersByStatus} isLoading={isLoading} />

        {/* Revenue vs Commissions */}
        <RevenueVsCommissionsChart 
          data={revenueVsCommissions} 
          isLoading={isLoading} 
        />


        {/* Returning vs New Customers */}
        <ReturningVsNewChart data={returningVsNew} isLoading={isLoading} />

        {/* Top Products */}
        <TopProductsChart data={topProducts} isLoading={isLoading} />

        {/* Sales by Seller */}
        <SalesBySellerChart data={salesBySeller} isLoading={isLoading} />
      </div>

      {/* Stock Levels - Full Width */}
      <StockLevelsChart data={stockLevels} isLoading={isLoading} />

      {/* Summary Section */}
      <SummarySection
        stats={stats}
        salesByCategory={salesByCategory}
        ordersByStatus={ordersByStatus}
        topProducts={topProducts}
        salesBySeller={salesBySeller}
        stockLevels={stockLevels}
      />
    </div>
  )
}

export default Analysis

