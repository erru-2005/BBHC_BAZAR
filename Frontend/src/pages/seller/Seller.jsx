/**
 * Seller Dashboard Page Component - Lucid Curator Theme
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { FiBox, FiClock, FiTrendingUp, FiBriefcase, FiUsers, FiArrowUpRight, FiMoreHorizontal, FiEye, FiPackage, FiSearch, FiCheckCircle, FiAlertCircle, FiPlus, FiXCircle, FiFilter, FiCopy, FiCheck, FiStar } from 'react-icons/fi'
import { FaQrcode } from 'react-icons/fa6'

import { getSocket } from '../../utils/socket'
import { getOrders, getSellerMyProducts, sellerAcceptOrder, sellerRejectOrder, updateOrderStatus, getServiceAcceptCredit, refreshSellerProfile } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import SellerNotifications from './components/SellerNotifications'
import SellerAnalytics from './components/SellerAnalytics'
import SellerWallet from './components/SellerWallet'
import SellerReviews from './components/SellerReviews'
import Toast from '../../components/Toast'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl, getOrderProductImage, resolveImageUrl } from '../../utils/image'
import { setSellerProducts, setSellerOrders, updateSellerOrder, setSellerLoading } from '../../store/sellerSlice'
import { updateUserInfo, restoreUser } from '../../store/authSlice'
import {
  AcceptServiceCreditBadge,
  AcceptServiceCreditDeduction,
  getServiceCategoryFromOrder,
} from './components/AcceptServiceCreditNotice'
const calculateArrivalDate = (createdAt, deliverySpan) => {
  if (!createdAt) return ''
  const span = Number(deliverySpan ?? 2)
  if (isNaN(span) || span < 1) return ''

  let daysToAdd = span - 1
  let currentDate = new Date(createdAt)

  // If today is Sunday, move to Monday (Sunday is not counted)
  while (currentDate.getDay() === 0) {
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Add days, skipping Sundays
  while (daysToAdd > 0) {
    currentDate.setDate(currentDate.getDate() + 1)
    if (currentDate.getDay() !== 0) {
      daysToAdd--
    }
  }

  const dd = String(currentDate.getDate()).padStart(2, '0')
  const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
  const yyyy = currentDate.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function Seller() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useSelector((state) => state.auth)
  const {
    orders,
    products: sellerProducts,
    ordersLoading,
    productsLoading
  } = useSelector((state) => state.seller)

  const [activeView, setActiveView] = useState('dashboard')
  const [ordersError, setOrdersError] = useState(null)
  const [notificationProcessingId, setNotificationProcessingId] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)
  const [qrCodeCopied, setQrCodeCopied] = useState(false)
  const [newOrderNotification, setNewOrderNotification] = useState(null)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [rejectingOrder, setRejectingOrder] = useState(null)
  const [acceptingOrder, setAcceptingOrder] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionProcessingId, setActionProcessingId] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState('product') // 'product', 'service'
  const [serviceConfirmation, setServiceConfirmation] = useState(null)
  const [serviceAcceptCredit, setServiceAcceptCredit] = useState(25)
  const [creditLoading, setCreditLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [selectedSpans, setSelectedSpans] = useState({})
  const [switchingRole, setSwitchingRole] = useState(false)

  useEffect(() => {
    getServiceAcceptCredit().then(setServiceAcceptCredit).catch(() => { })
  }, [])

  useEffect(() => {
    if (!serviceConfirmation) return
    const category = getServiceCategoryFromOrder(serviceConfirmation)
    setCreditLoading(true)
    getServiceAcceptCredit(true, category)
      .then(setServiceAcceptCredit)
      .catch(() => { })
      .finally(() => setCreditLoading(false))
  }, [serviceConfirmation])

  const { setIsAddingProduct } = useOutletContext()

  // Handle switching views from navigation state
  useEffect(() => {
    if (location.state?.view) {
      setActiveView(location.state.view)
    } else {
      setActiveView('dashboard')
    }
  }, [location.state])

  // Global socket listener initialization
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user?.id) return

    const handleNewOrder = (orderData) => {
      if (String(orderData?.seller_id) === String(user.id)) {
        dispatch(updateSellerOrder(orderData))
        // Trigger real-time notification popup
        setNewOrderNotification(orderData)
        // Clear after 10 seconds
        setTimeout(() => setNewOrderNotification(null), 10000)
      }
    }

    const handleOrderUpdated = (orderData) => {
      if (String(orderData?.seller_id) === String(user.id)) {
        dispatch(updateSellerOrder(orderData))
      }
    }

    socket.on('new_order', handleNewOrder)
    socket.on('order_updated', handleOrderUpdated)

    return () => {
      socket.off('new_order', handleNewOrder)
      socket.off('order_updated', handleOrderUpdated)
    }
  }, [user?.id, dispatch])

  // Background sync for service completion
  useEffect(() => {
    const syncServiceCompletion = async () => {
      if (!orders || orders.length === 0) return

      const servicesToComplete = orders.filter(o =>
        isOrderService(o) &&
        (o.status === 'seller_accepted' || o.status === 'accepted') &&
        isServiceDatePassed(o)
      )

      if (servicesToComplete.length > 0) {
        for (const order of servicesToComplete) {
          try {
            await updateOrderStatus(order.id || order._id, 'completed')
          } catch (err) {
            console.warn('Silent sync failure for order:', order.id || order._id, err.message)
          }
        }
      }
    }

    syncServiceCompletion()
  }, [orders])

  // Auto-refresh seller profile to keep session alive
  useEffect(() => {
    if (!user?.id) return

    const refreshProfile = async () => {
      try {
        const data = await refreshSellerProfile()
        if (data?.credits !== undefined) {
          dispatch(updateUserInfo({ credits: data.credits }))
        }
      } catch (error) {
        console.warn('Failed to auto-refresh seller profile:', error.message)
      }
    }

    // Refresh every 15 minutes (900000ms) to keep session alive
    const intervalId = setInterval(refreshProfile, 900000)

    // Also refresh immediately on mount
    refreshProfile()

    return () => clearInterval(intervalId)
  }, [user?.id, dispatch])

  // Load orders and products if missing
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      // Only fetch if data is missing
      if (orders.length === 0 || sellerProducts.length === 0) {
        try {
          dispatch(setSellerLoading({ field: 'orders', loading: true }))
          const [ordersData, productsData] = await Promise.all([
            getOrders(),
            getSellerMyProducts()
          ])
          const fetchedOrders = Array.isArray(ordersData?.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : [])
          dispatch(setSellerOrders(fetchedOrders))
          dispatch(setSellerProducts(productsData || []))
        } catch (error) {
          setOrdersError(error.message)
        } finally {
          dispatch(setSellerLoading({ field: 'orders', loading: false }))
        }
      }
    }
    loadData()
  }, [user, orders.length, sellerProducts.length, dispatch])

  // Stats calculation - synchronized with SellerAnalytics logic
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => !['cancelled', 'rejected', 'seller_rejected'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

    const activeCount = orders.filter(o =>
      ['pending_seller', 'seller_accepted', 'ready_for_pickup', 'pending', 'accepted'].includes(o.status)
    ).length

    const completedCount = orders.filter(o =>
      ['handed_over', 'completed', 'delivered'].includes(o.status)
    ).length

    return {
      totalProducts: sellerProducts.length,
      totalRevenue: totalRevenue,
      activeOrders: activeCount,
      completedOrders: completedCount,
      totalOrders: orders.length
    }
  }, [orders, sellerProducts])

  const chartData = [
    { name: 'WEEK 1', sales: 4200 },
    { name: 'WEEK 2', sales: 3800 },
    { name: 'WEEK 3', sales: 5400 },
    { name: 'WEEK 4', sales: 4900 },
  ]

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const topProductsColors = [
    'bg-blue-50 text-blue-600',
    'bg-purple-50 text-purple-600',
    'bg-emerald-50 text-emerald-600',
    'bg-rose-50 text-rose-600'
  ]

  const topProducts = sellerProducts.slice(0, 4).map((p, idx) => ({
    id: p.id || p._id,
    name: p.product_name || p.name,
    sales: 10 + Math.floor(Math.random() * 50),
    price: p.selling_price || p.price,
    image: p.thumbnail || p.image,
    color: topProductsColors[idx % 4]
  }))

  const recentOrders = useMemo(() => {
    let filtered = [...orders]

    // Status Filter Logic
    if (statusFilter === 'all') {
      // Default dashboard view: Active orders only
      const activeStates = ['pending_seller', 'seller_accepted', 'ready_for_pickup', 'pending', 'accepted']
      filtered = filtered.filter(o => activeStates.includes(o.status || 'pending_seller'))
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(o => ['pending_seller', 'pending'].includes(o.status))
    } else if (statusFilter === 'accepted') {
      filtered = filtered.filter(o => ['seller_accepted', 'accepted', 'ready_for_pickup'].includes(o.status))
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(o => ['handed_over', 'completed', 'delivered'].includes(o.status))
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter(o => ['cancelled', 'seller_rejected', 'rejected'].includes(o.status))
    }

    if (dashboardSearch) {
      const s = dashboardSearch.toLowerCase()
      filtered = filtered.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(s) ||
        (o.user?.name || '').toLowerCase().includes(s) ||
        (o.product?.name || o.product_snapshot?.name || '').toLowerCase().includes(s)
      )
    }

    if (dashboardTypeFilter !== 'all') {
      filtered = filtered.filter(o => {
        const productData = o.product || {}
        const productName = (productData.name || '').toLowerCase()
        const productCategories = (productData.categories || []).map(c => c.toLowerCase())

        // Use explicit 'type' field if available, fallback to existing heuristics
        const isService = o.type === 'service' ||
          (o.booking && (o.booking.type || o.booking.startDate || o.booking.endDate || o.booking.flexible)) ||
          productName.includes('creativework') ||
          productName.includes('service') ||
          productCategories.some(cat => cat.includes('service') || cat.includes('creative') || cat.includes('work'))

        return dashboardTypeFilter === 'product' ? !isService : !!isService
      })
    }

    return filtered.slice(0, 10)
  }, [orders, dashboardSearch, statusFilter, dashboardTypeFilter])

  // Helper to check if a service booking has completed based on current date
  const isServiceDatePassed = (order) => {
    if (!order?.booking) return false
    const targetDate = order.booking.endDate || order.booking.startDate
    if (!targetDate) return false

    // Parse YYYY-MM-DD safely
    const parts = targetDate.split('-')
    if (parts.length !== 3) return false

    const [year, month, day] = parts.map(Number)
    const bookingDate = new Date(year, month - 1, day)
    bookingDate.setHours(23, 59, 59, 999) // Completion only after the day ends

    return new Date() > bookingDate
  }

  const isOrderService = (order) => {
    if (!order) return false
    const productData = order.product || {}
    const productName = (productData.name || '').toLowerCase()
    const productCategories = (productData.categories || []).map(c => c.toLowerCase())

    return (order.booking && (order.booking.type || order.booking.startDate || order.booking.endDate)) ||
      productName.includes('creativework') ||
      productName.includes('creative') ||
      productName.includes('work') ||
      productName.includes('service') ||
      productCategories.some(cat => cat.includes('service') || cat.includes('creative') || cat.includes('work'))
  }

  const handleLocalAccept = async (orderId, deliverySpanVal = null) => {
    const order = orders.find(o => (o.id === orderId || o._id === orderId))
    const isService = isOrderService(order)

    if (isService && (user?.credits || 0) < serviceAcceptCredit) {
      setToast({
        show: true,
        message: `Insufficient credits! You need at least ${serviceAcceptCredit} credits to accept this service.`,
        type: 'error'
      })
      return
    }

    // OPTIMISTIC UPDATE: subtract category credit immediately for services
    if (isService) {
      const category = getServiceCategoryFromOrder(order)
      const deductAmount = category
        ? await getServiceAcceptCredit(true, category).catch(() => serviceAcceptCredit)
        : serviceAcceptCredit
      dispatch(updateUserInfo({ credits: Math.max(0, (user?.credits || 0) - deductAmount) }))
    }

    try {
      setActionProcessingId(orderId)
      const payload = isService ? null : { delivery_span: deliverySpanVal }
      const res = await sellerAcceptOrder(orderId, payload)
      if (res) {
        dispatch(updateSellerOrder(res.order || res))

        // Final sync with backend credits if returned
        if (res.credits !== undefined) {
          dispatch(updateUserInfo({ credits: res.credits }))
        }

        setToast({
          show: true,
          message: isService ? 'Service accepted successfully!' : 'Order accepted successfully!',
          type: 'success'
        })
      }
    } catch (err) {
      setToast({
        show: true,
        message: 'Acceptance failed: ' + err.message,
        type: 'error'
      })
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleLocalReject = async () => {
    if (!rejectingOrder || !rejectionReason.trim()) return
    try {
      setActionProcessingId(rejectingOrder.id)
      await sellerRejectOrder(rejectingOrder.id || rejectingOrder._id, rejectionReason)
      setRejectingOrder(null)
      setRejectionReason('')
      setSuccessMessage({
        title: 'Order Rejected',
        message: 'The order has been rejected successfully.',
        type: 'reject'
      })
    } catch (err) {
      alert('Rejection failed: ' + err.message)
    } finally {
      setActionProcessingId(null)
    }
  }

  if (activeView === 'orders') return <div className="p-4 md:p-12 max-w-7xl mx-auto w-full"><SellerOrders /></div>
  if (activeView === 'notifications') return <SellerNotifications />
  if (activeView === 'analytics') return <SellerAnalytics />
  if (activeView === 'wallet') return <SellerWallet />
  if (activeView === 'reviews') return <SellerReviews />

  const handleSwitchToUserMode = () => {
    try {
      const userToken = localStorage.getItem('bbhc_user_token');
      if (!userToken) {
        window.location.href = '/user/login';
        return;
      }
      
      setSwitchingRole(true)
      setTimeout(() => {
        window.location.href = '/user/profile'
      }, 1500)
    } catch (e) {
      console.error("Failed to switch to user mode:", e);
      window.location.href = '/user/login';
    }
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="relative group overflow-visible">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight relative z-10">
              <span className="block text-slate-800 transition-colors duration-300">Welcome back,</span>
              <motion.span
                className="block mt-1 capitalize text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-[#FF3399] to-blue-600 bg-[length:200%_auto] pb-2"
                animate={{ backgroundPosition: ['0% center', '-200% center'] }}
                transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              >
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || user?.full_name || 'Seller')}
              </motion.span>
            </h1>

            {/* High-end Ambient Glow */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.98, 1.02, 0.98] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl -z-10 rounded-[3rem] pointer-events-none"
            />
          </div>
        </motion.div>
        
        {localStorage.getItem('bbhc_user_token') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleSwitchToUserMode}
              disabled={switchingRole}
              className="group relative px-6 py-3 bg-white text-slate-700 font-bold rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-75"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <FiUsers className="w-4 h-4" />
              </div>
              {switchingRole ? 'Switching...' : 'Switch to User Mode'}
            </button>
          </motion.div>
        )}
      </section>

      {/* Quick Stats Grid - Mobile & Desktop Visibility */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-2">
        {[
          {
            label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: FiTrendingUp, color: 'blue',
            bg: 'bg-blue-500/10', text: 'text-blue-600', hoverBg: 'group-hover:bg-blue-600', border: 'border-blue-200/50'
          },
          {
            label: 'Active', value: stats.activeOrders, icon: FiClock, color: 'indigo',
            bg: 'bg-indigo-500/10', text: 'text-indigo-600', hoverBg: 'group-hover:bg-indigo-600', border: 'border-indigo-200/50'
          },
          {
            label: 'Completed', value: stats.completedOrders, icon: FiCheckCircle, color: 'emerald',
            bg: 'bg-emerald-500/10', text: 'text-emerald-600', hoverBg: 'group-hover:bg-emerald-600', border: 'border-emerald-200/50'
          },
          {
            label: 'Orders', value: stats.totalOrders, icon: FiPackage, color: 'rose',
            bg: 'bg-rose-500/10', text: 'text-rose-600', hoverBg: 'group-hover:bg-rose-600', border: 'border-rose-200/50'
          }
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 lg:p-6 flex flex-col gap-2 md:gap-4 relative overflow-hidden group shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border-2 ${item.border} rounded-[2.5rem] ${item.bg} backdrop-blur-xl ${item.action ? 'cursor-pointer hover:shadow-lg' : ''}`}
            onClick={item.action}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white opacity-[0.3] group-hover:opacity-[0.4] group-hover:scale-125 transition-all duration-700" />
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-white/90 shadow-md text-slate-900 group-hover:scale-110`}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${item.text}`}>{item.label}</p>
              <h2 className={`text-base md:text-xl lg:text-2xl font-black tracking-tighter truncate ${item.text}`}>{item.value}</h2>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="relative mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 group">
            {/* Dynamic Glow Layer */}
            <div className="absolute inset-0 bg-blue-500/10 rounded-[1.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />

            <div className="relative flex items-center">
              <FiSearch className="absolute left-6 text-slate-400 group-focus-within:text-blue-600 group-focus-within:scale-110 transition-all duration-300 w-5 h-5 z-10" />
              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Search orders, clients or items..."
                className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/80 pl-14 pr-12 py-5 rounded-[2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400/80 focus:border-blue-500/50 focus:bg-white focus:ring-8 focus:ring-blue-500/5 outline-none shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] group-hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300"
              />

              {/* Clear search button */}
              {dashboardSearch && (
                <button
                  onClick={() => setDashboardSearch('')}
                  className="absolute right-6 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
                >
                  <FiXCircle size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-5 rounded-[2rem] backdrop-blur-xl border-2 transition-all duration-300 shadow-lg ${isFilterOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20'
                : 'bg-white/40 text-slate-600 border-white/80 hover:bg-white hover:text-blue-600 shadow-black/5'
                }`}
            >
              <FiFilter className={`w-5 h-5 ${isFilterOpen ? 'animate-pulse' : ''}`} />

              {/* Active Filter Indicator Badge */}
              {statusFilter !== 'all' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Status Filter Dropdown */}
        <AnimatePresence>
          {isFilterOpen && (
            <>
              {/* Click-outside backdrop */}
              <div className="fixed inset-0 z-[90]" onClick={() => setIsFilterOpen(false)} />

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 z-[100] w-64 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] p-3 overflow-hidden"
              >
                <div className="px-4 py-2 mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filter Status</span>
                </div>
                {[
                  { id: 'all', label: 'All Active', icon: FiBox, color: 'text-blue-500', bg: 'hover:bg-blue-50' },
                  { id: 'pending', label: 'Pending', icon: FiClock, color: 'text-amber-500', bg: 'hover:bg-amber-50' },
                  { id: 'accepted', label: 'Accepted', icon: FiCheckCircle, color: 'text-indigo-500', bg: 'hover:bg-indigo-50' },
                  { id: 'completed', label: 'Completed', icon: FiPackage, color: 'text-emerald-500', bg: 'hover:bg-emerald-50' },
                  { id: 'cancelled', label: 'Cancelled', icon: FiXCircle, color: 'text-rose-500', bg: 'hover:bg-rose-50' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setStatusFilter(f.id)
                      setIsFilterOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${statusFilter === f.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : `text-slate-600 ${f.bg} hover:scale-[1.02]`
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <f.icon className={`w-4 h-4 ${statusFilter === f.id ? 'text-white' : f.color}`} />
                      <span className="text-[11px] font-black uppercase tracking-widest">{f.label}</span>
                    </div>
                    {statusFilter === f.id && <motion.div layoutId="active-dot" className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>

      {/* Recent Orders Section */}
      <section className="bg-transparent md:bg-sky-100/40 md:backdrop-blur-[40px] md:seller-card-premium p-0 md:p-10 rounded-none md:rounded-[4rem] border-0 md:border-2 border-white/60 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-12 px-4 md:px-0 pt-4 md:pt-0">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Recent Orders</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium tracking-wide mt-1 opacity-70">Real-time order synchronization active</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Type Filter Slider */}
            <div className="relative flex bg-slate-900/10 p-1.5 rounded-2xl border-2 border-slate-900/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] backdrop-blur-md w-full md:w-[320px] lg:w-[420px] h-14 overflow-hidden">
              {/* Animated Background Slider */}
              <motion.div
                className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.2)] border border-slate-200"
                initial={false}
                animate={{
                  left: dashboardTypeFilter === 'product' ? '6px' : 'calc(50% + 3px)',
                  right: dashboardTypeFilter === 'product' ? 'calc(50% + 3px)' : '6px'
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              {[
                { id: 'product', label: 'Products', icon: FiPackage },
                { id: 'service', label: 'Services', icon: FiBriefcase }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDashboardTypeFilter(t.id)}
                  className={`relative flex-1 flex items-center justify-center gap-3 z-10 transition-colors duration-300 ${dashboardTypeFilter === t.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <t.icon size={18} className={dashboardTypeFilter === t.id ? 'animate-pulse' : ''} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3 transition-all hover:space-x-1">
                {recentOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="w-12 h-12 rounded-full border-4 border-white bg-slate-50 overflow-hidden shadow-md">
                    {order.user?.image ? (
                      <img src={fixImageUrl(order.user.image)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-black uppercase">
                        {order.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs md:text-sm font-semibold text-slate-500 tracking-normal">+{orders.length} orders analyzed</p>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet View: High-Density Professional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden mt-4 px-4 pb-8 gap-4">
          {recentOrders.map((order, index) => {
            const status = order.status || 'pending_seller'
            const isAccepted = status === 'seller_accepted'
            const isPending = status === 'pending_seller'
            const productName = order.product_snapshot?.name || order.product?.name || 'PRODUCT NOT FOUND'
            const productImg = getOrderProductImage(order)

            const maxDays = order.product?.delivery_span || order.product_current?.delivery_span || order.delivery_span || 2
            const currentSpan = selectedSpans[order.id] || maxDays

            const orderDate = new Date(order.createdAt || order.created_at)
            const todayDate = new Date()
            orderDate.setHours(0, 0, 0, 0)
            todayDate.setHours(0, 0, 0, 0)
            const diffTime = todayDate - orderDate
            const daysPassed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

            const options = []
            for (let i = 1; i <= maxDays; i++) {
              let label = ''
              let disabled = false

              if (i < daysPassed + 1) {
                disabled = true
                if (i === daysPassed) {
                  label = `${i} Day (Yesterday)`
                } else {
                  label = `${i} Days (Passed)`
                }
              } else if (i === daysPassed + 1) {
                label = 'Today'
              } else if (i === daysPassed + 2) {
                label = 'Tomorrow'
              } else {
                label = `${i} Days`
              }

              options.push({ value: i, label, disabled })
            }

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      REF: {order.orderNumber?.split('-')?.pop() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isOrderService(order) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                      {isOrderService(order) ? 'Service' : 'Product'}
                    </span>
                    <div className="flex flex-col items-end mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isOrderService(order) ? 'Date' : 'Qty'}</span>
                      <span className="text-sm font-black text-slate-900">
                        {isOrderService(order) ? (order.booking?.startDate || 'Flexible') : (order.quantity || 1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-50 shrink-0">
                    {productImg ? (
                      <img src={fixImageUrl(productImg)} className="w-full h-full object-cover" />
                    ) : (
                      <FiPackage className="w-8 h-8 opacity-20" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-2 mb-1">{productName}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status.replace('_', ' ')}</span>
                    </div>
                    {!isOrderService(order) && (
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        Arrival: On/Before {order.arrivalDate || order.arrival_date || calculateArrivalDate(order.createdAt || order.created_at, order.delivery_span || currentSpan)}
                      </div>
                    )}
                    {status === 'pending_seller' && !isOrderService(order) && (
                      <div className="flex items-center gap-1 mt-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-sm w-fit">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Delivery:</span>
                        <select
                          value={currentSpan}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            setSelectedSpans(prev => ({ ...prev, [order.id]: val }))
                          }}
                          className="bg-transparent text-[10px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          {options.map((opt) => (
                            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {status === 'pending_seller' ? (
                    <>
                      <button
                        onClick={() => setRejectingOrder(order)}
                        disabled={actionProcessingId === order.id}
                        className="flex-1 py-3.5 rounded-xl border-2 border-rose-100 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] transition-all active:bg-rose-50"
                      >
                        REJECT
                      </button>
                      <button
                        onClick={() => handleLocalAccept(order.id, currentSpan)}
                        disabled={actionProcessingId === order.id}
                        className="flex-[2] py-3.5 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        {actionProcessingId === order.id ? 'PROCESSING...' : (isOrderService(order) ? 'ACCEPT SERVICE' : 'ACCEPT')}
                      </button>
                    </>
                  ) : isOrderService(order) ? (
                    <div className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-1 ${isServiceDatePassed(order) || status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      <div className="flex items-center gap-2">
                        {isServiceDatePassed(order) || status === 'completed' ? <><FiCheckCircle /> COMPLETED</> : <><FiClock /> ACCEPTED</>}
                      </div>
                      {order.booking?.startDate && (
                        <span className="text-[8px] opacity-70 tracking-normal normal-case">Scheduled: {order.booking.startDate}</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setQrOrder(order)}
                      className="w-full py-4 rounded-xl bg-slate-900 text-white shadow-xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <FaQrcode className="w-4 h-4" /> HANDOVER CODE
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-xs font-bold text-slate-700 tracking-normal border-b border-slate-100">
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">{dashboardTypeFilter === 'service' ? 'Service Details' : dashboardTypeFilter === 'product' ? 'Product Details' : 'Asset Details'}</th>
                <th className="px-6 py-4 text-center">{dashboardTypeFilter === 'service' ? 'Booking Date' : 'Quantity'}</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, index) => {
                const status = order.status || 'pending_seller'
                const isAccepted = status === 'seller_accepted'
                const isPending = status === 'pending_seller'
                const productName = order.product_snapshot?.name || order.product?.name || 'PRODUCT NOT FOUND'
                const productImg = getOrderProductImage(order)

                const maxDays = order.product?.delivery_span || order.product_current?.delivery_span || order.delivery_span || 2
                const currentSpan = selectedSpans[order.id] || maxDays

                const options = []
                for (let i = 1; i <= maxDays; i++) {
                  if (i === 1) options.push({ value: 1, label: 'Today' })
                  else if (i === 2) options.push({ value: 2, label: 'Tomorrow' })
                  else options.push({ value: i, label: `${i} Days` })
                }

                return (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-4 py-5 first:rounded-l-[2rem] bg-white/30 border-y border-l border-white/40 group-hover:bg-white/50 group-hover:border-blue-200 transition-all">
                      <span className="text-xs font-black text-slate-400 tracking-widest pl-3">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-5 bg-white/30 border-y border-white/40 group-hover:bg-white/50 group-hover:border-blue-200 transition-all">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${isOrderService(order) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                        {isOrderService(order) ? 'Service' : 'Product'}
                      </span>
                    </td>
                    <td className="px-4 py-5 bg-white/30 border-y border-white/40 group-hover:bg-white/50 group-hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm shrink-0">
                          {productImg ? (
                            <img src={fixImageUrl(productImg)} className="w-full h-full object-cover" />
                          ) : (
                            <FiPackage className="w-6 h-6 opacity-20" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 tracking-tight line-clamp-1">{productName}</span>
                          <div className="flex flex-col gap-1.5 mt-0.5">
                            {isOrderService(order) ? (
                              <div className="flex items-center gap-1.5 text-blue-600">
                                <FiBriefcase size={10} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Professional Service</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                  <FiPackage size={10} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Standard Delivery</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  Arrival: On/Before {order.arrivalDate || order.arrival_date || calculateArrivalDate(order.createdAt || order.created_at, order.delivery_span || currentSpan)}
                                </span>
                                {status === 'pending_seller' && (
                                  <div className="flex items-center gap-1 mt-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-sm w-fit">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Delivery:</span>
                                    <select
                                      value={currentSpan}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10)
                                        setSelectedSpans(prev => ({ ...prev, [order.id]: val }))
                                      }}
                                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                    >
                                      {options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 bg-white/30 border-y border-white/40 group-hover:bg-white/50 group-hover:border-blue-200 transition-all text-center">
                      <div className="flex flex-col items-center">
                        {isOrderService(order) ? (
                          <>
                            <span className="text-sm font-bold text-slate-900">{order.booking?.startDate || 'Flexible'}</span>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Date</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-slate-900">{order.quantity || 1}</span>
                            <span className="text-xs font-medium text-slate-400 tracking-normal">Units</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5 last:rounded-r-[2rem] bg-white/30 border-y border-r border-white/40 group-hover:bg-white/50 group-hover:border-blue-200 transition-all text-center">
                      <div className="flex items-center justify-center gap-3">
                        {status === 'pending_seller' ? (
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05, backgroundColor: '#FFF1F2' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setRejectingOrder(order)}
                              disabled={actionProcessingId === order.id}
                              className="px-4 py-2.5 rounded-xl border border-rose-100 text-rose-500 font-bold text-xs tracking-normal transition-all disabled:opacity-50"
                            >
                              REJECT
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05, boxShadow: '0 10px 20px -5px rgba(37,99,235,0.3)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleLocalAccept(order.id, currentSpan)}
                              disabled={actionProcessingId === order.id}
                              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs tracking-normal transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {actionProcessingId === order.id ? <FiClock className="animate-spin" /> : (isOrderService(order) ? 'ACCEPT SERVICE' : 'ACCEPT')}
                            </motion.button>
                          </div>
                        ) : isOrderService(order) ? (
                          <div className="flex flex-col items-center gap-0.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100/50">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                              {isServiceDatePassed(order) || status === 'completed' ? <><FiCheckCircle /> Completed</> : <><FiClock /> Accepted</>}
                            </div>
                            {order.booking?.startDate && (
                              <span className="text-[9px] text-emerald-500/70 font-medium tracking-tight">On {order.booking.startDate}</span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setQrOrder(order)}
                            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white shadow-xl hover:bg-blue-600 font-bold text-xs tracking-normal transition-all flex items-center gap-2"
                          >
                            <FaQrcode className="w-3.5 h-3.5" /> Handover Code
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => navigate('/seller/dashboard', { state: { view: 'orders' } })}
          className="w-full mt-6 py-5 bg-slate-100 rounded-[1.5rem] text-sm font-bold text-slate-700 tracking-normal hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-[0.99]"
        >
          Explore All Transactions
        </button>
      </section>

      {/* QR Modal integration */}
      <AnimatePresence>
        {qrOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
            onClick={() => setQrOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 text-center shadow-2xl relative border border-slate-100"
              style={{ width: 'clamp(260px, 90%, 320px)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tighter">Handover Code</h3>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-4">
                <QRCode
                  value={qrOrder.secureTokenSeller || qrOrder.id}
                  size={120}
                  level="M"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>

              {/* Token code + Copy button */}
              {(() => {
                const token = qrOrder.secureTokenSeller || qrOrder.id
                const handleCopy = () => {
                  navigator.clipboard.writeText(token).then(() => {
                    setQrCodeCopied(true)
                    setTimeout(() => setQrCodeCopied(false), 2000)
                  }).catch(() => {
                    const el = document.createElement('textarea')
                    el.value = token
                    document.body.appendChild(el)
                    el.select()
                    document.execCommand('copy')
                    document.body.removeChild(el)
                    setQrCodeCopied(true)
                    setTimeout(() => setQrCodeCopied(false), 2000)
                  })
                }
                return (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-6">
                    <code className="flex-1 text-[10px] font-mono text-slate-600 truncate select-all">
                      {token}
                    </code>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopy}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        qrCodeCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                      }`}
                    >
                      {qrCodeCopied ? <FiCheck className="w-3 h-3" /> : <FiCopy className="w-3 h-3" />}
                      {qrCodeCopied ? 'Copied!' : 'Copy'}
                    </motion.button>
                  </div>
                )
              })()}

              <button
                onClick={() => setQrOrder(null)}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                DISMISS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* New Order Alert Popup */}
      <AnimatePresence>
        {rejectingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setRejectingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 w-full shadow-2xl relative border border-slate-50"
              style={{ width: 'clamp(280px, 90%, 350px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <FiAlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Reject Order?</h3>
                <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">REF: {rejectingOrder.orderNumber?.split('-')?.pop()}</p>
              </div>

              <div className="space-y-6">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium text-slate-900 focus:bg-white focus:border-rose-500 outline-none transition-all min-h-[100px] resize-none"
                />

                <div className="flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={actionProcessingId === rejectingOrder.id || !rejectionReason.trim()}
                    onClick={handleLocalReject}
                    className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    {actionProcessingId === rejectingOrder.id ? (
                      <FiClock className="animate-spin w-4 h-4" />
                    ) : (
                      'REJECT ORDER'
                    )}
                  </motion.button>
                  <button
                    onClick={() => setRejectingOrder(null)}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newOrderNotification && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.8, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 flex items-center gap-5 cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => {
                setNewOrderNotification(null)
                setActiveView('orders')
              }}
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white shadow-lg animate-bounce-slow">
                <FiPackage size={30} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Incoming Transmission</h4>
                </div>
                <p className="font-bold text-sm leading-tight text-slate-100">NEW ORDER FOR YOU!</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Ref: {newOrderNotification.orderNumber?.split('-').pop() || '000X'}</p>
              </div>
              <button className="text-white/40 hover:text-white" onClick={(e) => { e.stopPropagation(); setNewOrderNotification(null); }}>×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast
        isVisible={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
      <AnimatePresence>
        {switchingRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl"
            >
              <FiUsers className="w-10 h-10 text-blue-600 animate-pulse" />
            </motion.div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-2 text-center px-4"
            >
              Switching to User Profile...
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-blue-100 text-center px-4"
            >
              Loading your user dashboard
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Seller
