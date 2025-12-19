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
import QRCode from 'react-qr-code'
import SellerOrders from './components/SellerOrders'
import PasswordResetDialog from '../../components/PasswordResetDialog'

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
      const { openMenu, ...rest } = location.state || {}
      navigate(location.pathname + location.search, { replace: true, state: rest })
    }
  }, [location.state?.openMenu, location.state?.search, location.pathname, location.search, navigate])

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
      accent: 'from-sky-500 via-blue-500 to-indigo-500'
    },
    {
      id: 'admin',
      label: 'Admin Notifications',
      accent: 'from-pink-500 via-fuchsia-500 to-rose-500'
    }
  ]

  const displayedTabData =
    notificationTabs.find((tab) => tab.id === displayedNotificationTab) ?? notificationTabs[0]

  const activeIndicatorAccent =
    notificationTabs.find((tab) => tab.id === activeNotificationTab)?.accent ||
    'from-white to-white'

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
      gradient: 'from-indigo-500/80 to-indigo-400/60'
    },
    {
      label: 'Total Sales',
      value: formatCurrency(totalSales),
      change: '',
      gradient: 'from-emerald-500/80 to-teal-400/60'
    },
    {
      label: 'Orders Pending',
      value: pendingCount.toString(),
      change: '',
      gradient: 'from-amber-500/80 to-orange-400/60'
    }
  ]

  const renderStatIcon = (label) => {
    if (label === 'Total Products') {
      return (
        <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
          <rect
            x="6"
            y="9"
            width="20"
            height="14"
            rx="4"
            className="fill-white/10 stroke-current"
            strokeWidth="1.6"
          />
          <path
            d="M10 13h12M10 17h7"
            className="stroke-current"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    }
    if (label === 'Total Sales') {
      return (
        <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
          <path
            d="M8 11h16l-1.4 9.1A2 2 0 0 1 20.6 22H11.4a2 2 0 0 1-1.98-1.7L8 11Z"
            className="fill-white/10 stroke-current"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M13 11a3 3 0 0 1 6 0"
            className="stroke-current"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )
    }
    // Orders Pending
    return (
      <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r="9"
          className="fill-white/10 stroke-current"
          strokeWidth="1.6"
        />
        <path
          d="M16 12v4.2l2.4 2.4"
          className="stroke-current"
          strokeWidth="1.6"
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

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#EAF3FF] via-[#F7F7FA] to-[#F4ECFF] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-900/80 bg-black text-white shadow-md shadow-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-4 sm:px-4 sm:py-5 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-sm shadow-black/40 transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-white/40 hover:bg-white/10 active:scale-95"
              aria-label="Open navigation"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 shadow-[0_15px_32px_rgba(0,0,0,0.3)] sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-black sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-semibold tracking-wide text-pink-500 sm:text-base">
                  Bazaar
                </span>
              </div>
              <p className="hidden text-[11px] uppercase tracking-[0.32em] text-slate-300 sm:inline">
                Seller Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-100 sm:inline sm:text-sm">
              Welcome, <span className="font-semibold text-white">{user?.trade_id || 'Seller'}</span>
            </span>
            <button
              type="button"
              onClick={() => setResetPasswordOpen(true)}
              className="text-xs font-semibold text-slate-100 underline-offset-4 hover:underline sm:text-sm"
            >
              Reset password
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-100/60 bg-white/10 px-3 py-1.5 text-xs font-medium text-red-50 shadow-sm shadow-slate-900/40 transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-500/90 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-64 bg-slate-950 text-white shadow-2xl shadow-black/60 transition-transform duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <p className="text-sm font-semibold tracking-wide text-white/80">Quick Links</p>
              <button
                type="button"
                className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20"
                onClick={() => setIsSidebarOpen(false)}
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4 text-sm">
              {menuItems.map(({ label, icon: ItemIcon, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    action?.()
                    setIsSidebarOpen(false)
                  }}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left font-medium text-white/90 transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                      <ItemIcon className="h-4 w-4" />
                    </span>
                    {label}
                  </span>
                  <span className="text-xs text-white/60">›</span>
                </button>
              ))}
            </nav>
          </div>
          <button
            type="button"
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close navigation"
          />
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-0 lg:pb-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
          {showOrders ? (
            <SellerOrders />
          ) : (
            <>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ label, value, change, gradient }) => (
              <article
                key={label}
                className="relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[28px] border border-white/15 bg-slate-900/5 px-4 py-4 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.5)] sm:px-5 sm:py-5"
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-r ${gradient} opacity-60`}
                />
                <div className="pointer-events-none absolute inset-[2px] rounded-[26px] bg-slate-950/85 mix-blend-normal" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sky-50 shadow-inner shadow-black/30 ring-1 ring-white/30 sm:h-12 sm:w-12">
                  {renderStatIcon(label)}
                </div>
                <div className="relative flex flex-col">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-200 sm:text-xs">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">{value}</p>
                  <p className="text-[11px] text-slate-200/90 sm:text-[13px]">{change}</p>
                </div>
              </article>
            ))}
          </div>

          <section className="relative mt-1 rounded-3xl border border-white/40 bg-white/80 p-3 text-xs text-slate-700 shadow-[0_25px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-4 sm:text-sm">
            <div className="mb-4 flex w-full justify-center">
              <div
                ref={tabListRef}
                className="relative flex w-full items-center rounded-full bg-white/10 p-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500 shadow-inner shadow-black/20 backdrop-blur-xl"
              >
                <span
                  className={`absolute top-1 bottom-1 rounded-full bg-gradient-to-r ${activeIndicatorAccent} shadow-[0_12px_30px_rgba(99,102,241,0.3)] transition-all duration-300 ease-out`}
                  style={{
                    width: `${tabIndicatorStyle.width}px`,
                    transform: `translateX(${tabIndicatorStyle.left}px)`
                  }}
                />
                {notificationTabs.map((tab) => (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el
                    }}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative z-10 flex-1 rounded-full px-4 py-1.5 text-center text-[12px] font-semibold tracking-wide transition-all duration-300 ease-out hover:scale-[1.04] ${
                      activeNotificationTab === tab.id
                        ? 'text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br ${displayedTabData.accent} p-px shadow-inner shadow-white/40 transition-all duration-300 ease-out ${
                isNotificationContentFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
              }`}
            >
              <div className="relative rounded-[18px] bg-white/92 px-4 py-4 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:px-5 sm:py-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg shadow-slate-500/40">
                    <svg viewBox="0 0 32 32" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
                      <path
                        d="M16 6a5 5 0 0 0-5 5v1.2c0 .7-.3 1.4-.8 1.9L9 15.3A2 2 0 0 0 8.4 16.7L8 18h16l-.4-1.3A2 2 0 0 0 23 15.3l-.2-.2a2.7 2.7 0 0 1-.8-1.9V11a5 5 0 0 0-5-5Z"
                        className="fill-none stroke-current"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 23a2 2 0 0 0 4 0"
                        className="stroke-current"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {displayedTabData.label}
                    </p>
                    <p className="text-base font-semibold text-slate-900 sm:text-lg">
                      {displayedNotificationTab === 'orders'
                        ? 'Incoming order requests waiting for your action'
                        : 'Important updates and announcements from admin'}
                    </p>
                  </div>
                </div>

                {displayedNotificationTab === 'admin' ? (
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    <p className="text-xs text-slate-500">
                      No new admin notifications at the moment.
                    </p>
                  </div>
                ) : ordersLoading ? (
                  <p className="mt-2 text-sm text-slate-600">Loading orders...</p>
                ) : ordersError ? (
                  <p className="mt-2 text-sm text-red-600">{ordersError}</p>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {pendingOrders.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No new order requests. You&apos;re all caught up!
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {orders
                          .filter((order) =>
                            ['pending_seller', 'seller_accepted'].includes(order.status)
                          )
                          .slice(0, 12)
                          .map((order) => (
                            <li
                              key={order.id}
                              className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                            >
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-slate-800">
                                  #{order.orderNumber} · {order.product?.name || 'Product'}
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  {order.user?.name || 'Customer'} requested {order.quantity} × ₹
                                  {Number(order.unitPrice || 0).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {order.status === 'pending_seller' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAccept(order.id)}
                                      disabled={notificationProcessingId === order.id}
                                      className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                      {notificationProcessingId === order.id ? 'Accepting…' : 'Accept'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickReject(order.id)}
                                      disabled={notificationProcessingId === order.id}
                                      className="rounded-full border border-rose-300 px-3 py-1 text-[11px] font-semibold text-rose-600 bg-white hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {order.status === 'seller_accepted' && (
                                  <button
                                    type="button"
                                    onClick={() => setQrOrder(order)}
                                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100"
                                  >
                                    <FaQrcode className="h-3 w-3" />
                                    QR Code
                                  </button>
                                )}
                                {/* Completed orders are moved to history and not shown here */}
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
            </>
          )}
        </div>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Seller QR Code</h3>
            <p className="text-sm text-slate-600 mb-4">
              Ask the outlet to scan this code when handing over the product to complete the order.
            </p>
            <div className="inline-block rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-3">
              <QRCode value={qrOrder.secureTokenSeller} size={200} />
            </div>
            <p className="mb-4 text-xs font-mono text-slate-500 break-all">
              Token: {qrOrder.secureTokenSeller}
            </p>
            <button
              type="button"
              onClick={() => setQrOrder(null)}
              className="w-full rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

