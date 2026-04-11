/**
 * Seller Dashboard Page Component
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FiBox,
  FiMenu,
  FiX,
  FiHome,
  FiBriefcase,
  FiLogOut,
  FiPlusSquare,
  FiBell,
  FiSettings,
  FiChevronLeft,
  FiClock,
  FiTrendingUp,
  FiRefreshCw
} from 'react-icons/fi'
import { FaQrcode, FaCheck } from 'react-icons/fa6'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import { initActiveCounterSocket } from '../../utils/activeCounterSocket'
import { getOrders, getProducts, getSellerMyProducts, sellerAcceptOrder, sellerRejectOrder } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import QRCode from 'react-qr-code'
import PasswordResetDialog from '../../components/PasswordResetDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl } from '../../utils/image'

function Seller() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useSelector((state) => state.auth)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeNotificationTab, setActiveNotificationTab] = useState('orders')
  const [displayedNotificationTab, setDisplayedNotificationTab] = useState('orders')
  const [showOrders, setShowOrders] = useState(false)
  const [isNotificationContentFading, setIsNotificationContentFading] = useState(false)
  const tabRefs = useRef({})
  const tabListRef = useRef(null)
  const fadeTimeoutRef = useRef(null)
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ width: 0, left: 0 })
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState(null)
  const [notificationProcessingId, setNotificationProcessingId] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)
  const autoHideCompletedRef = useRef(new Set())
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [sellerProducts, setSellerProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)


  // Open sidebar if coming from another page requesting menu
  useEffect(() => {
    if (location.state?.openMenu) {
      setIsSidebarOpen(true)
    }
    // Handle switching to 'orders' view from navigation state
    if (location.state?.view === 'orders') {
      setShowOrders(true)
    } else if (location.state?.view === 'dashboard') {
      setShowOrders(false)
    }
  }, [location.state])

  // ... (keeping existing code code is implied by the replacedblock, but I need to be careful with replace_file_content chunking)
  // Actually, I should probably do two edits or a multi-replace to be safe and clean.
  // One to add the state, one to uncomment. 
  // Wait, I can't use "comment out" replacement easily if I just want to add state at the top.
  // Let's use multi_replace.

  const handleLogout = () => {
    // Notify server about logout via socket
    const socket = getSocket()
    if (socket && socket.connected && user) {
      socket.emit('user_logout', {
        user_id: user.id,
        user_type: 'seller'
      })
    }

    // Disconnect socket
    disconnectSocket()

    // Clear device token
    clearDeviceToken()
    // Clear saved seller state
    localStorage.removeItem('seller_active_tab')
    // Dispatch logout action
    dispatch(logout())
    // Navigate to login page
    navigate('/seller/login')
  }

  // Initialize socket connection on component mount & listen for order updates
  useEffect(() => {
    if (!user || !user.id || !token) {
      return
    }

    // Initialize active counter socket with role='seller'
    initActiveCounterSocket('seller')

    const socket = initSocket(token)
    if (socket) {
      socket.on('connect', () => {
        // Socket connection with auth token will automatically update seller status
        // The backend connect handler will emit seller:connected event
        socket.emit('user_authenticated', {
          user_id: user.id,
          user_type: 'seller'
        })
      })

      // If already connected, emit immediately
      if (socket.connected) {
        socket.emit('user_authenticated', {
          user_id: user.id,
          user_type: 'seller'
        })
      }
    }

    socket.on('new_order', (orderData) => {
      // Only add if this order is for current seller
      if (!orderData?.seller_id || String(orderData.seller_id) !== String(user.id)) return

      setOrders((prev) => {
        const exists = prev.find((o) => o.id === orderData.id)
        if (exists) return prev
        return [orderData, ...prev]
      })
    })

    socket.on('order_updated', (orderData) => {
      if (!orderData?.seller_id || String(orderData.seller_id) !== String(user.id)) return

      setOrders((prev) =>
        prev.map((order) => (order.id === orderData.id ? orderData : order))
      )

      // If order is now completed, schedule auto-removal from incoming list
      if (['handed_over', 'completed', 'delivered'].includes(orderData.status)) {
        const idStr = String(orderData.id)
        if (!autoHideCompletedRef.current.has(idStr)) {
          autoHideCompletedRef.current.add(idStr)
          setTimeout(() => {
            setOrders((prev) => prev.filter((o) => String(o.id) !== idStr))
          }, 2 * 60 * 1000) // 2 minutes
        }
      }
    })

    return () => {
      const socketInstance = getSocket()
      if (socketInstance && socketInstance.connected && user) {
        socketInstance.emit('user_logout', {
          user_id: user.id,
          user_type: 'seller'
        })
      }
    }
  }, [user, token])

  // Load seller orders for dashboard summaries
  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.id) return
      try {
        setOrdersLoading(true)
        setOrdersError(null)
        const data = await getOrders()
        // Backend now handles filtering by seller_id in /orders endpoint for 'seller' user type
        const orderList = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? data
            : []
        
        setOrders(orderList)
      } catch (error) {
        setOrdersError(error.message || 'Failed to load orders')
      } finally {
        setOrdersLoading(false)
      }
    }
    loadOrders()
  }, [user])

  // Load seller products for dashboard stats
  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return
      try {
        setProductsLoading(true)
        const products = await getSellerMyProducts()
        setSellerProducts(products)
      } catch (err) {
        setSellerProducts([])
      } finally {
        setProductsLoading(false)
      }
    }
    loadProducts()
  }, [user])

  const menuItems = [
    { label: 'Home', icon: FiHome, action: () => { setShowOrders(false); navigate('/seller/dashboard') } },
    { label: 'Orders', icon: FiBox, action: () => setShowOrders(true) },
    { label: 'Products', icon: FiBox, action: () => navigate('/seller/products') },
    { label: 'Add Product', icon: FiPlusSquare, action: () => navigate('/seller/products/new') },
<<<<<<< HEAD
    { label: 'Services', icon: FiBriefcase, action: () => null }
=======
    { label: 'My Services', icon: FiBriefcase, action: () => navigate('/seller/services') },
    { label: 'Add Service', icon: FiPlusSquare, action: () => navigate('/seller/services/new') }
>>>>>>> 99043c5a86eb1a28f8db7107183f09dd515ca906
  ]

  // Tabs for notifications: incoming requests + admin notifications
  const notificationTabs = [
    {
      id: 'orders',
      label: 'Incoming Requests',
      accent: 'from-rose-500/10 to-pink-500/5 border-rose-500/20'
    },
    {
      id: 'admin',
      label: 'Admin Notifications',
      accent: 'from-indigo-500/10 to-purple-500/5 border-indigo-500/20'
    }
  ]

  const displayedTabData =
    notificationTabs.find((tab) => tab.id === displayedNotificationTab) ?? notificationTabs[0]

  const activeIndicatorAccent =
    notificationTabs.find((tab) => tab.id === activeNotificationTab)?.accent ||
    'bg-rose-600'

  // Orders to show in Incoming Requests: pending + accepted (awaiting scan/completion)
  const pendingOrders = orders.filter((o) =>
    ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(o.status)
  )

  const completedStatuses = ['handed_over', 'completed', 'delivered', 'seller_completed']
  const cancelledStatuses = ['cancelled', 'seller_rejected', 'rejected', 'buyer_cancelled']

  const pendingCount = useMemo(
    () =>
      orders.filter(
        (o) => !completedStatuses.includes(o.status) && !cancelledStatuses.includes(o.status)
      ).length,
    [orders]
  )

  const totalSales = useMemo(() => {
    return orders.reduce((sum, order) => {
      const amount =
        order.total_amount ??
        order.total ??
        order.amount ??
        order.grand_total ??
        order.payable ??
        0
      return sum + Number(amount || 0)
    }, 0)
  }, [orders])

  // 30‑day revenue snapshot for premium dashboard feel
  const recentRevenue = useMemo(() => {
    if (!orders?.length) return 0
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)

    return orders.reduce((sum, order) => {
      const createdAt = order.createdAt || order.created_at
      if (!createdAt) return sum
      const created = new Date(createdAt)
      if (Number.isNaN(created.getTime()) || created < thirtyDaysAgo) return sum

      const amount =
        order.total_amount ??
        order.total ??
        order.amount ??
        order.grand_total ??
        order.payable ??
        0
      return sum + Number(amount || 0)
    }, 0)
  }, [orders])

  const productCount = sellerProducts.length

  const formatCurrency = (value) => {
    const num = Number(value || 0)
    if (!Number.isFinite(num)) return '₹0'
    return `₹${num.toLocaleString('en-IN')}`
  }

  const stats = {
    totalProducts: productCount.toString(),
    totalSales: totalSales,
    pendingOrders: pendingCount.toString(),
    revenue30Days: recentRevenue
  }

  useEffect(() => {
    setIsNotificationContentFading(true)
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)

    fadeTimeoutRef.current = setTimeout(() => {
      setDisplayedNotificationTab(activeNotificationTab)
      fadeTimeoutRef.current = setTimeout(() => {
        setIsNotificationContentFading(false)
      }, 60)
    }, 200)

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    }
  }, [activeNotificationTab])

  useEffect(() => {
    const updateIndicator = () => {
      const list = tabListRef.current
      const current = tabRefs.current[activeNotificationTab]
      if (list && current) {
        const listRect = list.getBoundingClientRect()
        const rect = current.getBoundingClientRect()
        setTabIndicatorStyle({
          width: rect.width,
          left: rect.left - listRect.left
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeNotificationTab])

  const handleTabChange = (tabId) => {
    if (tabId === activeNotificationTab) return
    setActiveNotificationTab(tabId)
  }

  const handleQuickAccept = async (orderId) => {
    setNotificationProcessingId(orderId)
    setOrdersError(null)
    try {
      const updated = await sellerAcceptOrder(orderId)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      // Do not auto-open QR; seller can click "QR Code" button to view it
    } catch (error) {
      setOrdersError(error.message || 'Failed to accept order')
    } finally {
      setNotificationProcessingId(null)
    }
  }

  const handleQuickReject = async (orderId) => {
    setNotificationProcessingId(orderId)
    setOrdersError(null)
    try {
      const updated = await sellerRejectOrder(orderId)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
    } catch (error) {
      setOrdersError(error.message || 'Failed to reject order')
    } finally {
      setNotificationProcessingId(null)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  }

  return (
    <div className="relative min-h-screen spatial-bg bg-[#111827] text-slate-100 pb-[96px] md:pb-0 selection:bg-[#FF2E63]/30">
      {/* Background Layering */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[520px] h-[520px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header - Premium dark glass top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-slate-800/80 bg-[#020617]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/90 border border-white/10 transition-colors hover:bg-white/10 md:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </motion.button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3.5 py-1.5 shadow-inner ring-1 ring-slate-700/80 backdrop-blur-sm sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-bold tracking-tight text-white sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-bold text-[#FF2E63] sm:text-base">
                  Bazaar
                </span>
              </div>
              <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:inline">
                Seller
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-[#FF2E63]/80 font-bold">
                Welcome back
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                {user?.trade_id || 'Seller'}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
              type="button"
            >
              <FiBell className="h-4 w-4" />
            </motion.button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors border border-[#7C3AED]"
              type="button"
            >
              <FiLogOut className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Sidebar - Enhanced with Glass and Motion */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 h-full bg-[#0f1218] border-r border-white/5 flex flex-col relative overflow-hidden"
            >
              {/* Visual Flair Area */}
              <div className="absolute top-0 left-0 right-0 h-48 z-0">
                <svg viewBox="0 0 500 200" className="w-full h-full text-white/5" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,0 L500,0 L500,100 Q250,150 0,100 Z" />
                </svg>
              </div>

              {/* Sidebar Header: User Profile */}
              <div className="relative z-10 p-8 flex flex-col items-center text-center gap-4 group cursor-pointer border-b border-white/5" onClick={() => { setIsSidebarOpen(false); }}>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF2E63] to-rose-600 p-0.5 shadow-xl shadow-rose-500/20 group-hover:scale-105 transition-transform duration-500">
                  <div className="w-full h-full rounded-full bg-[#0f1218] flex items-center justify-center overflow-hidden border-2 border-white/10">
                    {user?.image_url || user?.image ? (
                        <img 
                          src={fixImageUrl(user.image_url || user.image)} 
                          alt="Profile" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://ui-avatars.com/api/?name=" + (user?.trade_id || "S") + "&background=FF2E63&color=fff";
                          }}
                        />
                    ) : (
                        <span className="text-2xl font-black text-white">
                          {user?.trade_id?.charAt(0).toUpperCase() || 'S'}
                        </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white tracking-tight truncate max-w-[200px]">
                    {user?.trade_id || 'Seller Account'}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF2E63] bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/10">View Profile</p>
                </div>
              </div>

              {/* Main Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1.5 relative z-10 no-scrollbar overflow-y-auto">
                {menuItems.map(({ label, icon: ItemIcon, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      action?.()
                      setIsSidebarOpen(false)
                    }}
                    className="w-full flex items-center gap-5 px-6 py-3.5 rounded-[20px] text-slate-400 hover:text-white transition-all group hover:bg-white/[0.03]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-[#FF2E63] group-hover:text-white transition-all duration-300">
                      <ItemIcon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">{label}</span>
                  </motion.button>
                ))}
              </nav>

              {/* Sidebar Footer */}
              <div className="p-6 border-t border-white/5 relative z-10 bg-[#0f1218]">
                <div className="flex items-center justify-between px-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <FiSettings className="w-3.5 h-3.5" />
                    <span className="font-black text-[10px] uppercase tracking-[0.2em]">Settings</span>
                  </motion.button>
                  <div className="w-[1px] h-3 bg-white/10" />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-rose-500/80 hover:text-rose-400 transition-colors"
                  >
                    <FiLogOut className="w-3.5 h-3.5" />
                    <span className="font-black text-[10px] uppercase tracking-[0.2em]">Logout</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-0 lg:pb-16 mt-4 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {showOrders ? (
            <motion.div
              key="orders-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SellerOrders />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-view"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              {/* Stats Grid - Optimized for Mobile First */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {[
                  { label: 'Total Products', value: stats.totalProducts, icon: FiBox, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Total Sales', value: formatCurrency(stats.totalSales), icon: FiBriefcase, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Orders Pending', value: stats.pendingOrders, icon: FiClock, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { label: 'Revenue (30 Days)', value: formatCurrency(stats.revenue30Days), icon: FiTrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                ].map(({ label, value, icon: Icon, color: iconColor, bg: iconBg }) => (
                  <motion.article
                    key={label}
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1218]/80 backdrop-blur-xl border border-white/5 shadow-2xl transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Visual Accent */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${iconBg} opacity-50`} />
                    
                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 sm:p-3 rounded-2xl bg-slate-900/70 border border-slate-700 ${iconColor}`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-white/5 backdrop-blur-sm">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Overview</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-300 tracking-tight">{value}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Activity Section */}
              <motion.section variants={itemVariants} className="p-4 sm:p-6 bg-[#1E293B]/80 backdrop-blur-sm border border-slate-800/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#FF2E63] rounded-full" />
                    <h3 className="text-lg font-black tracking-tight text-slate-100">Recent Activity</h3>
                  </div>
                  <div
                    ref={tabListRef}
                    className="relative flex items-center rounded-xl bg-slate-950/80 p-1 border border-white/5 self-start sm:self-auto"
                  >
                    <motion.span
                      layoutId="active-tab-glow"
                      className="absolute inset-y-1 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 shadow-lg"
                      style={{
                        width: `${tabIndicatorStyle.width}px`,
                        left: `${tabIndicatorStyle.left}px`
                      }}
                    />
                    {notificationTabs.map((tab) => (
                      <button
                        key={tab.id}
                        ref={(el) => (tabRefs.current[tab.id] = el)}
                        onClick={() => handleTabChange(tab.id)}
                        className={`relative z-10 px-4 py-1.5 text-[12px] font-semibold tracking-tight transition-colors ${activeNotificationTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={displayedNotificationTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {displayedNotificationTab === 'admin' ? (
                        <div className="py-16 flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
                            <FiBell className="w-6 h-6 text-slate-200" />
                          </div>
                          <p className="text-sm font-black text-slate-100 uppercase tracking-widest">Inbox Empty</p>
                          <p className="text-xs text-slate-400 mt-1">No system notifications at the moment</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pendingOrders.length === 0 ? (
                            <div className="py-12 flex flex-col items-center text-center opacity-50">
                              <FiBox className="w-10 h-10 mb-4 text-[#7C3AED]/60" />
                              <p className="text-sm font-medium">All caught up!</p>
                            </div>
                          ) : (
                            <ul className="space-y-3">
                              <AnimatePresence mode="popLayout">
                                  {pendingOrders.map((order) => (
                                    <motion.li
                                      key={order.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="relative overflow-hidden group rounded-[30px] bg-[#0f1218]/40 border border-white/5 hover:bg-[#1a1f2e] transition-all duration-300"
                                    >
                                      <div className="p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-4">
                                        {/* Product Image */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-xl shadow-black/40">
                                          {order.product?.image ? (
                                            <img src={fixImageUrl(order.product.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                          ) : (
                                            <FiBox className="text-slate-600 w-6 h-6" />
                                          )}
                                        </div>

                                        {/* Product & Order Info */}
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                              Order Status
                                            </span>
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate">
                                              #{order.orderNumber?.split('-').pop()}
                                            </span>
                                          </div>
                                          <h4 className="font-black text-[15px] sm:text-base text-slate-100 truncate group-hover:text-white transition-colors">
                                            {order.product?.name || 'Unknown Product'}
                                          </h4>
                                          <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5 mt-1 border-t border-white/5 pt-1">
                                            {order.user?.name} <span className="text-slate-600">·</span> {order.quantity} {order.quantity > 1 ? 'Units' : 'Unit'}
                                          </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="w-full sm:w-auto flex items-center gap-2 sm:ml-auto mt-2 sm:mt-0">
                                          {order.status === 'pending_seller' ? (
                                            <>
                                              <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleQuickAccept(order.id)}
                                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#FF2E63] hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all"
                                              >
                                                Accept
                                              </motion.button>
                                              <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleQuickReject(order.id)}
                                                className="p-2.5 rounded-2xl bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-white/5"
                                              >
                                                <FiX className="w-5 h-5" strokeWidth={3} />
                                              </motion.button>
                                            </>
                                          ) : (
                                            <motion.button
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => setQrOrder(order)}
                                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all"
                                            >
                                              <FaQrcode className="text-xs" />
                                              Show QR
                                            </motion.button>
                                          )}
                                        </div>
                                      </div>
                                    </motion.li>
                                  ))}
                              </AnimatePresence>
                            </ul>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>



      <PasswordResetDialog
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        userType="seller"
        identifier={user?.trade_id}
        displayLabel="Seller"
      />

      {/* QR Code modal for accepted orders */}
      {qrOrder && qrOrder.secureTokenSeller && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-sm rounded-[24px] bg-[#020617] p-6 text-center shadow-2xl ring-1 ring-slate-800">
            <h3 className="text-2xl font-extrabold text-[#7C3AED] mb-2">Seller QR Code</h3>
            <p className="text-sm font-medium text-slate-400 mb-6 px-4">
              Ask the outlet to scan this code when handing over the product.
            </p>
            <div className="inline-block rounded-[20px] border-4 border-[#7C3AED]/30 bg-slate-900 p-4 mb-5 shadow-lg shadow-[#7C3AED]/30">
              <QRCode value={qrOrder.secureTokenSeller} size={180} />
            </div>
            <p className="mb-6 text-xs font-mono font-bold text-slate-300 break-all bg-slate-900/70 py-3 px-4 rounded-xl border border-slate-700 tracking-wider">
              {qrOrder.secureTokenSeller}
            </p>
            <button
              type="button"
              onClick={() => setQrOrder(null)}
              className="w-full rounded-xl bg-[#FF2E63] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF2E63]/30 active:scale-95 transition-all hover:bg-[#ff4577]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Seller

