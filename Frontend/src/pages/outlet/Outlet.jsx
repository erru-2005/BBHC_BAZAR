/**
 * Outlet Dashboard Page Component
 */
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { disconnectSocket } from '../../utils/socket'
import { HiHome } from 'react-icons/hi'
import { FaShoppingBag, FaBars, FaSignOutAlt, FaSearch, FaQrcode, FaTimes, FaCheck, FaUser, FaBox, FaStore } from 'react-icons/fa'
import OrdersList from '../master/components/OrdersList'
import { scanOrderToken, getOrders, refreshSellerProfile, logoutUser, getOutletSlots } from '../../services/api'
import { setOutletOrders, setOutletLoading, updateOutletOrder } from '../../store/outletSlice'
import { updateUserInfo } from '../../store/authSlice'

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

function Outlet() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, userType, token } = useSelector((state) => state.auth)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Initialize socket on mount
  useEffect(() => {
    if (token && userType === 'outlet_man') {
      import('../../utils/activeCounterSocket').then(({ initActiveCounterSocket }) => {
        initActiveCounterSocket('outlet', token)
      })
    }
  }, [token, userType])
  const [activeTab, setActiveTab] = useState('home')
  const [tokenInput, setTokenInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)
  const [pendingToken, setPendingToken] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  const { orders, loading: loadingOrders, lastFetched } = useSelector(state => state.outlet)

  const isToday = (dateString) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const now = new Date()
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }
  
  // Today's completed orders only, newest first
  const completedOrders = orders
    .filter(order => order?.status === 'completed')
    .filter(order => isToday(order.updatedAt || order.updated_at || order.createdAt || order.created_at))
    .sort((a, b) => {
      const dateA = new Date(a?.updatedAt || a?.updated_at || a?.createdAt || a?.created_at || 0)
      const dateB = new Date(b?.updatedAt || b?.updated_at || b?.createdAt || b?.created_at || 0)
      return dateB - dateA
    })

  // Auto-logout if different user type tries to access
  useEffect(() => {
    if (userType && userType !== 'outlet_man') {
      handleLogout()
    }
  }, [userType])

  // Auto-refresh profile to keep session alive for both sellers and outlet men
  useEffect(() => {
    if (!user?.id) return
    
    const refreshProfile = async () => {
      try {
        const data = await refreshSellerProfile()
        if (data?.credits !== undefined) {
          dispatch(updateUserInfo({ credits: data.credits }))
        }
      } catch (error) {
        console.warn('Failed to auto-refresh profile:', error.message)
      }
    }
    
    // Refresh every 15 minutes (900000ms) to keep session alive
    const intervalId = setInterval(refreshProfile, 900000)
    
    // Also refresh immediately on mount
    refreshProfile()
    
    return () => clearInterval(intervalId)
  }, [user?.id, dispatch])

  // Load completed orders if missing or on tab change
  useEffect(() => {
    if (activeTab === 'home' && (!lastFetched || orders.length === 0)) {
      loadCompletedOrders()
    }
  }, [activeTab, orders.length, lastFetched])

  const loadCompletedOrders = async () => {
    try {
      dispatch(setOutletLoading(true))
      const fetchedData = await getOrders({ page: 1, limit: 100 }, { forceRefresh: true })
      const orderList = Array.isArray(fetchedData?.orders) ? fetchedData.orders : (Array.isArray(fetchedData) ? fetchedData : [])
      dispatch(setOutletOrders(orderList))
    } catch (err) {
      console.error('Failed to load completed orders:', err)
    } finally {
      dispatch(setOutletLoading(false))
    }
  }

  useEffect(() => {
    if (activeTab === 'slots') {
      loadSlots()
    }
  }, [activeTab])

  const loadSlots = async () => {
    try {
      setLoadingSlots(true)
      const data = await getOutletSlots()
      setSlots(data)
    } catch (err) {
      console.error('Failed to load slots:', err)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (e) {
      console.error(e)
    }
    dispatch(logout())
    clearDeviceToken()
    disconnectSocket()
    navigate('/outlet/login')
  }

  const handleTabSelection = (tabId) => {
    setActiveTab(tabId)
    setIsMenuOpen(false)
  }

  // Get outlet man name
  const outletManName = user 
    ? (user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name || user.last_name || user.outlet_access_code || user.email || 'Outlet Man')
    : 'Outlet Man'

  const handleTokenScan = async () => {
    if (!tokenInput.trim()) {
      setScanError('Please enter a token')
      return
    }

    const scannedToken = tokenInput.trim()
    setScanning(true)
    setScanError(null)
    setScanResult(null)
    setPendingOrder(null)
    setPendingToken(scannedToken)
    setShowOrderDetails(false)

    try {
      // Get order details IN PREVIEW MODE first
      const order = await scanOrderToken(scannedToken, true)
      
      // Show details popup - user must confirm to take action
      setPendingOrder(order)
      setShowOrderDetails(true)
      
      setTokenInput('')
    } catch (err) {
      setScanError(err.message || 'Failed to scan token')
      setScanResult({
        success: false,
        message: err.message || 'Failed to scan token'
      })
    } finally {
      setScanning(false)
    }
  }

  const handleConfirmScan = async () => {
    if (!pendingOrder || !pendingToken) return

    setConfirming(true)
    try {
      // PERFORM ACTUAL ACTION NOW (preview = false)
      const updatedOrder = await scanOrderToken(pendingToken, false)
      
      await loadCompletedOrders()
      setShowOrderDetails(false)
      
      setScanResult({
        success: true,
        message: getScanMessage(updatedOrder, pendingToken),
        order: updatedOrder
      })
      
      setPendingOrder(null)
      setPendingToken('')
    } catch (err) {
      setScanError(err.message || 'Failed to confirm')
      setShowOrderDetails(false)
    } finally {
      setConfirming(false)
    }
  }

  const getScanMessage = (order, scannedToken) => {
    const sellerToken = order.secureTokenSeller || order.secure_token_seller
    const userToken = order.secureTokenUser || order.secure_token_user
    
    const isSellerToken = sellerToken && scannedToken === sellerToken
    const isUserToken = userToken && scannedToken === userToken

    if (isSellerToken) {
      return 'Order handed over to outlet successfully!'
    } else if (isUserToken) {
      return 'Order completed successfully!'
    } else if (order.status === 'completed') {
      return 'Order already completed.'
    }
    return 'Token scanned successfully.'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Integrated Tabs - Full Black */}
      <div className="bg-black shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex justify-between items-center py-4">
            {/* Brand Logo with Animation */}
            <div className="flex items-center">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/outlet')}
                className="relative group cursor-pointer flex-shrink-0"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-10 group-hover:opacity-30 transition-all duration-500" />
                
                <div className="relative flex items-center bg-black border border-gray-800 rounded-xl py-1.5 px-3 shadow-sm overflow-hidden">
                  <motion.div 
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                  />
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">BBHC</span>
                    <span className="text-xl sm:text-2xl font-bold text-[#f4369e] tracking-tight">Bazaar</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Welcome Message */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-white capitalize">{outletManName}</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Outlet Manager</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold">
                  {outletManName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <FaBars className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleTabSelection('home')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'home'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <HiHome className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleTabSelection('orders')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaShoppingBag className="w-4.5 h-4.5" />
              <span>Orders</span>
            </button>
            <button
              onClick={() => handleTabSelection('slots')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'slots'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaBox className="w-4.5 h-4.5" />
              <span>Slots</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {activeTab === 'home' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">Outlet Dashboard</h2>
              <p className="text-gray-500 font-medium">Scan order tokens to verify and complete transactions</p>
            </div>

            {/* Token Search/Scan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
                  <FaQrcode className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Token Scanner</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTokenScan()}
                  placeholder="Enter token or scan QR code"
                  className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-black/5 focus:border-black text-black font-medium transition-all"
                />
                <button
                  onClick={handleTokenScan}
                  disabled={scanning || !tokenInput.trim()}
                  className="px-8 py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95"
                >
                  <FaSearch className="w-4 h-4" />
                  {scanning ? 'Searching...' : 'Scan Token'}
                </button>
              </div>

              {scanError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2"
                >
                  <FaTimes className="shrink-0" /> {scanError}
                </motion.div>
              )}

              {scanResult && !showOrderDetails && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-6 p-5 rounded-2xl border ${
                  scanResult.success 
                    ? 'bg-green-50 border-green-100 text-green-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {scanResult.success ? <FaCheck /> : <FaTimes />}
                    <p className="font-bold uppercase tracking-wider text-xs">{scanResult.success ? 'Action Successful' : 'Action Failed'}</p>
                  </div>
                  <p className="font-medium">{scanResult.message}</p>
                  {scanResult.order && (
                    <div className="mt-3 pt-3 border-t border-current/10 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase opacity-70">Order #{scanResult.order.orderNumber}</span>
                      <span className="text-xs font-bold uppercase px-2 py-1 bg-current/10 rounded-lg">{scanResult.order.status}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Recently Completed Orders */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Recent Completions</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">Today Only</span>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching orders...</p>
                </div>
              ) : completedOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-gray-400 font-medium">No completed orders found for today</p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards View */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {completedOrders.map((order) => (
                      <div key={order.id} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Ref</p>
                            <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-sm font-bold text-gray-900">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-xl border border-gray-100">
                          <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <FaBox className="text-gray-300 w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate uppercase">{order.product?.name || 'N/A'}</p>
                            <p className="text-[10px] font-medium text-gray-500 mt-1">Customer: {order.user?.name || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                           <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg uppercase">Completed</span>
                           <span className="text-[10px] font-medium text-gray-400">{formatDate(order.updatedAt || order.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <th className="pb-4 px-4">Order #</th>
                          <th className="pb-4 px-4">Product Details</th>
                          <th className="pb-4 px-4">Entity Details</th>
                          <th className="pb-4 px-4 text-right">Amount</th>
                          <th className="pb-4 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedOrders.map((order) => (
                          <tr key={order.id} className="group hover:bg-gray-50 transition-all">
                            <td className="py-4 px-4 bg-white border-y border-l border-gray-100 first:rounded-l-2xl">
                              <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                            </td>
                            <td className="py-4 px-4 bg-white border-y border-gray-100">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-800 uppercase tracking-tight truncate max-w-[150px]">{order.product?.name || 'N/A'}</span>
                                <span className="text-[10px] font-bold text-gray-400">QTY: {order.quantity}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 bg-white border-y border-gray-100">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-blue-600 uppercase">Seller: {order.seller?.trade_id || 'N/A'}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Cust: {order.user?.name || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 bg-white border-y border-gray-100 text-right">
                              <span className="text-sm font-bold text-gray-900">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-4 px-4 bg-white border-y border-r border-gray-100 last:rounded-r-2xl">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(order.updatedAt || order.createdAt)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Enter the token manually or scan the QR code</li>
                <li>Seller tokens: Confirm product has been handed over</li>
                <li>User tokens: Confirm user has collected and paid</li>
                <li>Tokens can only be used once</li>
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'orders' && <OrdersList />}
        {activeTab === 'slots' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">Outlet Slots</h2>
                <p className="text-gray-500 font-medium">Manage and view items assigned to slots.</p>
              </div>
              <button 
                onClick={loadSlots}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Refresh
              </button>
            </div>
            
            {loadingSlots ? (
               <div className="flex flex-col items-center py-12 gap-4">
                 <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching slots...</p>
               </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {slots.map(slot => (
                  <div 
                    key={slot.slot_number}
                    onClick={() => slot.is_occupied && setSelectedSlot(slot)}
                    className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                      slot.is_occupied 
                      ? 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:shadow-md'
                      : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl font-black text-gray-300">{slot.slot_number}</span>
                      {slot.is_occupied ? (
                         <span className="px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase">Occupied</span>
                      ) : (
                         <span className="px-2 py-1 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full uppercase">Free</span>
                      )}
                    </div>
                    {slot.is_occupied && (
                      <div className="space-y-2">
                         <div className="flex items-center gap-2">
                           <FaUser className="text-blue-400 shrink-0" />
                           <p className="font-bold text-gray-900 truncate" title={slot.user_name}>{slot.user_name}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           <FaBox className="text-blue-400 shrink-0" />
                           <p className="text-sm font-medium text-gray-700">{slot.item_count} items</p>
                         </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slot Details Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Slot {selectedSlot.slot_number} Details</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-gray-400 hover:text-gray-600 transition">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                 <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</h4>
                 <p className="text-xl font-bold text-gray-900">{selectedSlot.user_name}</p>
              </div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Items in Slot ({selectedSlot.item_count})</h4>
              <div className="space-y-3">
                {selectedSlot.items?.map((item, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900 mb-1">
                      {item.product_name} 
                      <span className="ml-2 text-sm font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-md">
                        Qty: {item.quantity || 1}
                      </span>
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Order: #{item.order_number}</span>
                      <span>Seller: {item.seller_name}</span>
                    </div>
                  </div>
                ))}
                {!selectedSlot.items?.length && (
                  <p className="text-gray-500 italic">No detailed items found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Popup */}
      {showOrderDetails && pendingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
              <button
                onClick={() => {
                  setShowOrderDetails(false)
                  setPendingOrder(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Order Number</span>
                  <span className="text-sm font-bold text-gray-900">{pendingOrder.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Status</span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    pendingOrder.status === 'completed' 
                      ? 'bg-green-100 text-green-700'
                      : pendingOrder.status === 'handed_over'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {pendingOrder.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                {!pendingOrder.booking && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Expected Delivery</span>
                    <span className="text-sm font-bold text-emerald-700">
                      On or before {calculateArrivalDate(pendingOrder.createdAt || pendingOrder.created_at, pendingOrder.delivery_span)}
                    </span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FaBox className="w-5 h-5 text-gray-700" />
                  <h4 className="text-lg font-semibold text-gray-900">Product Details</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Product Name:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.product?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Quantity:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Unit Price:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{Number(pendingOrder.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₹{Number(pendingOrder.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seller Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FaStore className="w-5 h-5 text-gray-700" />
                  <h4 className="text-lg font-semibold text-gray-900">Seller Details</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trade ID:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.seller?.trade_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {pendingOrder.seller?.first_name || ''} {pendingOrder.seller?.last_name || ''}
                      {!pendingOrder.seller?.first_name && !pendingOrder.seller?.last_name && 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.seller?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.seller?.phone_number || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* User Details (Minimum) */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FaUser className="w-5 h-5 text-gray-700" />
                  <h4 className="text-lg font-semibold text-gray-900">Customer Details</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {pendingOrder.user?.name || 
                       `${pendingOrder.user?.first_name || ''} ${pendingOrder.user?.last_name || ''}`.trim() || 
                       'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-semibold text-gray-900">{pendingOrder.user?.phone || pendingOrder.user?.phone_number || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowOrderDetails(false)
                    setPendingOrder(null)
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleConfirmScan}
                  disabled={confirming}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCheck className="w-4 h-4" />
                  {confirming ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu - Visible on all screen sizes */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Menu</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {user && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Welcome, {outletManName}</p>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button
                onClick={() => handleTabSelection('home')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'home'
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HiHome className="w-5 h-5" />
                  <span>Home</span>
                </div>
              </button>
              <button
                onClick={() => handleTabSelection('orders')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaShoppingBag className="w-5 h-5" />
                  <span>Orders</span>
                </div>
              </button>
              <button
                onClick={() => handleTabSelection('slots')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'slots'
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaBox className="w-5 h-5" />
                  <span>Slots</span>
                </div>
              </button>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                <FaSignOutAlt className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Outlet
