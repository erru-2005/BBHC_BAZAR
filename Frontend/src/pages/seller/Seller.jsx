/**
 * Seller Dashboard Page Component
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiBox, FiMenu, FiX, FiHome, FiBriefcase, FiLogOut, FiPlusSquare } from 'react-icons/fi'
import { FaQrcode, FaCheck } from 'react-icons/fa6'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import { initActiveCounterSocket } from '../../utils/activeCounterSocket'
import { getOrders, getProducts, sellerAcceptOrder, sellerRejectOrder } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import QRCode from 'react-qr-code'
import PasswordResetDialog from '../../components/PasswordResetDialog'
import { motion, AnimatePresence } from 'framer-motion'

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
        const orderList = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? data
            : []
        const sellerOrders = orderList.filter(
          (order) => order.seller_id && String(order.seller_id) === String(user.id)
        )
        setOrders(sellerOrders)
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
        const productList = await getProducts()
        const normalized = Array.isArray(productList?.products)
          ? productList.products
          : Array.isArray(productList)
            ? productList
            : []

        const sellerTradeId = user.trade_id
        const sellerId = String(user.id || user._id || '')

        const owned = normalized.filter((product) => {
          const matchTradeId =
            sellerTradeId &&
            (product.seller_trade_id === sellerTradeId ||
              product.created_by === sellerTradeId ||
              product.created_by_user_id === sellerTradeId)
          const matchId =
            sellerId &&
            (String(product.created_by_user_id || '') === sellerId ||
              String(product.seller_id || '') === sellerId)
          return matchTradeId || matchId
        })
        setSellerProducts(owned)
      } catch (err) {
        // silent fail for dashboard badge
        setSellerProducts([])
      } finally {
        setProductsLoading(false)
      }
    }
    loadProducts()
  }, [user])

  const menuItems = [
    { label: 'Home', icon: FiHome, action: () => { setShowOrders(false); navigate('/seller/dashboard') } },
    // Treat this as full order history view
    { label: 'My Orders (History)', icon: FiBox, action: () => setShowOrders(true) },
    { label: 'My Products', icon: FiBox, action: () => navigate('/seller/products') },
    { label: 'Add Product', icon: FiPlusSquare, action: () => navigate('/seller/products/new') },
    { label: 'My Services', icon: FiBriefcase, action: () => null }
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
    ['pending_seller', 'seller_accepted'].includes(o.status)
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

  const productCount = sellerProducts.length

  const formatCurrency = (value) => {
    const num = Number(value || 0)
    if (!Number.isFinite(num)) return '₹0'
    return `₹${num.toLocaleString('en-IN')}`
  }

  const stats = [
    {
      label: 'Total Products',
      value: productsLoading ? '...' : productCount.toString(),
      change: '',
      gradient: 'from-rose-500/5 to-rose-500/10',
      iconColor: 'text-rose-500',
      fillColor: 'fill-rose-500/10'
    },
    {
      label: 'Total Sales',
      value: formatCurrency(totalSales),
      change: '',
      gradient: 'from-emerald-500/5 to-emerald-500/10',
      iconColor: 'text-emerald-600',
      fillColor: 'fill-emerald-500/10'
    },
    {
      label: 'Orders Pending',
      value: pendingCount.toString(),
      change: '',
      gradient: 'from-amber-500/5 to-amber-500/10',
      iconColor: 'text-amber-600',
      fillColor: 'fill-amber-500/10'
    }
  ]

  const renderStatIcon = (label, color) => {
    if (label === 'Total Products') {
      return (
        <svg viewBox="0 0 32 32" className={`h-6 w-6 ${color}`} aria-hidden="true">
          <rect
            x="6"
            y="9"
            width="20"
            height="14"
            rx="4"
            className="fill-current opacity-20"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M10 13h12M10 17h7"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    }
    if (label === 'Total Sales') {
      return (
        <svg viewBox="0 0 32 32" className={`h-6 w-6 ${color}`} aria-hidden="true">
          <path
            d="M8 11h16l-1.4 9.1A2 2 0 0 1 20.6 22H11.4a2 2 0 0 1-1.98-1.7L8 11Z"
            className="fill-current opacity-20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M13 11a3 3 0 0 1 6 0"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )
    }
    // Orders Pending
    return (
      <svg viewBox="0 0 32 32" className={`h-6 w-6 ${color}`} aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r="9"
          className="fill-current opacity-20"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16 12v4.2l2.4 2.4"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
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
    <div className="relative min-h-screen spatial-bg text-white pb-[96px] md:pb-0 selection:bg-rose-500/30">
      {/* Background Layering */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header - Upgraded to Glass Panel */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-white/5">
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
              <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3.5 py-1.5 shadow-inner ring-1 ring-white/10 backdrop-blur-sm sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-white sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-bold text-rose-300 sm:text-base active-glow">
                  Bazaar
                </span>
              </div>
              <p className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 sm:inline">
                Seller
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Welcome back</span>
              <span className="text-sm font-bold text-white tracking-tight">{user?.trade_id || 'Seller'}</span>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <motion.button
              whileHover={{ color: '#F43F5E' }}
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors border border-white/5"
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
              className="w-72 glass-panel border-r border-white/10 flex flex-col h-full"
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center font-bold">B</div>
                  <span className="font-bold tracking-tight">Navigation</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg bg-white/5"
                >
                  <FiX className="h-4 w-4" />
                </motion.button>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(({ label, icon: ItemIcon, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      action?.()
                      setIsSidebarOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-300 hover:text-white transition-colors border border-transparent hover:border-white/5"
                  >
                    <ItemIcon className="h-5 w-5 text-rose-400" strokeWidth={2.5} />
                    <span className="font-bold text-sm text-slate-200 group-hover:text-white">{label}</span>
                  </motion.button>
                ))}
              </nav>
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
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map(({ label, value, gradient, iconColor }) => (
                  <motion.article
                    key={label}
                    variants={itemVariants}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="spatial-card relative p-6 cursor-pointer group"
                  >
                    {/* Glowing Accent */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity`} />

                    <div className="relative flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${iconColor} active-glow`}>
                          {renderStatIcon(label, '')}
                        </div>
                        <div className="px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          Overview
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                        <p className="text-3xl font-black text-white tracking-tight mt-1">{value}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Activity Section */}
              <motion.section variants={itemVariants} className="spatial-card p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black tracking-tight text-slate-100">Recent Activity</h3>
                  <div
                    ref={tabListRef}
                    className="relative flex items-center rounded-xl bg-white/5 p-1 border border-white/5"
                  >
                    <motion.span
                      layoutId="active-tab-glow"
                      className="absolute inset-y-1 rounded-lg bg-white/10 border border-white/10 shadow-lg"
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
                        className={`relative z-10 px-4 py-1.5 text-[11px] font-black tracking-tight transition-colors ${activeNotificationTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
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
                        <div className="py-12 flex flex-col items-center text-center opacity-50">
                          <div className="w-12 h-12 rounded-full border border-dashed border-white/20 mb-4" />
                          <p className="text-sm font-medium">No system notifications</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pendingOrders.length === 0 ? (
                            <div className="py-12 flex flex-col items-center text-center opacity-50">
                              <FiBox className="w-10 h-10 mb-4 text-rose-500/50" />
                              <p className="text-sm font-medium">All caught up!</p>
                            </div>
                          ) : (
                            <ul className="space-y-3">
                              <AnimatePresence mode="popLayout">
                                {pendingOrders.map((order) => (
                                  <motion.li
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
                                        {order.product?.image ? (
                                          <img src={order.product.image} className="w-full h-full object-cover" />
                                        ) : (
                                          <FiBox className="text-slate-500" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-black text-sm text-white group-hover:text-rose-400 transition-colors">#{order.orderNumber} · {order.product?.name}</p>
                                        <p className="text-xs text-slate-400 font-bold">{order.user?.name} · {order.quantity} unit{order.quantity > 1 ? 's' : ''}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {order.status === 'pending_seller' ? (
                                        <>
                                          <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleQuickAccept(order.id)}
                                            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
                                          >
                                            Accept
                                          </motion.button>
                                          <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleQuickReject(order.id)}
                                            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                                          >
                                            <FiX className="w-4 h-4" strokeWidth={2.5} />
                                          </motion.button>
                                        </>
                                      ) : (
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => setQrOrder(order)}
                                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold"
                                        >
                                          <FaQrcode className="active-glow" />
                                          Show QR
                                        </motion.button>
                                      )}
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
          <div className="w-full max-w-sm rounded-[24px] bg-slate-900 p-6 text-center shadow-2xl ring-1 ring-white/10">
            <h3 className="text-2xl font-extrabold text-rose-500 mb-2">Seller QR Code</h3>
            <p className="text-sm font-medium text-slate-400 mb-6 px-4">
              Ask the outlet to scan this code when handing over the product.
            </p>
            <div className="inline-block rounded-[20px] border-4 border-rose-500/20 bg-white p-4 mb-5 shadow-lg shadow-rose-900/20">
              <QRCode value={qrOrder.secureTokenSeller} size={180} />
            </div>
            <p className="mb-6 text-xs font-mono font-bold text-slate-400 break-all bg-white/5 py-3 px-4 rounded-xl border border-white/10 tracking-wider">
              {qrOrder.secureTokenSeller}
            </p>
            <button
              type="button"
              onClick={() => setQrOrder(null)}
              className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 active:scale-95 transition-all hover:bg-rose-700"
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

