/**
 * Seller Dashboard Page Component
 */
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiBox, FiMenu, FiX, FiHome, FiBriefcase, FiLogOut, FiPlusSquare } from 'react-icons/fi'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import SellerOrders from './components/SellerOrders'

function Seller() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
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

  // Initialize socket connection on component mount
  useEffect(() => {
    // User data should be in Redux state from login
    if (!user || !user.id || !token) {
      // If no user or token in Redux, ProtectedRoute will handle redirect
      return
    }
    
    // Initialize socket connection
    const socket = initSocket(token)
    socket.on('connect', () => {
      socket.emit('user_authenticated', {
        user_id: user.id,
        user_type: 'seller'
      })
    })
    
    return () => {
      // Cleanup on unmount
      const socket = getSocket()
      if (socket && socket.connected && user) {
        socket.emit('user_logout', {
          user_id: user.id,
          user_type: 'seller'
        })
      }
    }
  }, [user, token])

  const menuItems = [
    { label: 'Home', icon: FiHome, action: () => { setShowOrders(false); navigate('/seller/dashboard') } },
    { label: 'My Orders', icon: FiBox, action: () => setShowOrders(true) },
    { label: 'My Products', icon: FiBox, action: () => navigate('/seller/products') },
    { label: 'Add Product', icon: FiPlusSquare, action: () => navigate('/seller/products/new') },
    { label: 'My Services', icon: FiBriefcase, action: () => null }
  ]

  const stats = [
    {
      label: 'Total Products',
      value: '152',
      change: '+12 added this week',
      gradient: 'from-indigo-500/80 to-indigo-400/60'
    },
    {
      label: 'Total Sales',
      value: '₹2.4L',
      change: '+18% vs last week',
      gradient: 'from-emerald-500/80 to-teal-400/60'
    },
    {
      label: 'Orders Pending',
      value: '27',
      change: '5 need attention',
      gradient: 'from-amber-500/80 to-orange-400/60'
    }
  ]

  const notificationTabs = [
    {
      id: 'orders',
      label: 'Order Notifications',
      accent: 'from-sky-500 via-blue-500 to-indigo-500',
      items: [
        '3 new orders placed in the last 15 minutes.',
        '2 orders are awaiting shipment confirmation.'
      ]
    },
    {
      id: 'admin',
      label: 'Admin Notifications',
      accent: 'from-pink-500 via-fuchsia-500 to-rose-500',
      items: [
        'New update from Master Admin: Stock synchronization completed successfully.',
        'Policy reminder: Update service hours for the upcoming holiday.'
      ]
    }
  ]

  const displayedTabData =
    notificationTabs.find((tab) => tab.id === displayedNotificationTab) ?? notificationTabs[0]

  const activeIndicatorAccent =
    notificationTabs.find((tab) => tab.id === activeNotificationTab)?.accent ||
    'from-white to-white'

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
                      Stay in control of the latest updates
                    </p>
                  </div>
                </div>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {displayedTabData.items.map((item, index) => (
                    <li
                      key={item}
                      className={`flex items-start gap-2 transition-all duration-300 ease-out ${
                        isNotificationContentFading
                          ? 'opacity-0 translate-y-2'
                          : 'opacity-100 translate-y-0'
                      }`}
                      style={{ transitionDelay: `${index * 80}ms` }}
                    >
                      <span className="text-slate-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Seller

