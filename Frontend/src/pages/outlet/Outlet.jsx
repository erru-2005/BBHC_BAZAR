/**
 * Outlet Dashboard Page Component
 */
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { disconnectSocket } from '../../utils/socket'
import { HiHome } from 'react-icons/hi'
import { FaShoppingBag, FaBars, FaSignOutAlt, FaSearch, FaQrcode, FaTimes, FaCheck, FaUser, FaBox, FaStore } from 'react-icons/fa'
import OrdersList from '../master/components/OrdersList'
import { scanOrderToken, getOrders } from '../../services/api'
import { setOutletOrders, setOutletLoading, updateOutletOrder } from '../../store/outletSlice'

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
  const [confirming, setConfirming] = useState(false)
  
  const { orders, loading: loadingOrders, lastFetched } = useSelector(state => state.outlet)
  
  // Derived state for completed orders
  const completedOrders = orders
    .filter(order => order?.status === 'completed')
    .sort((a, b) => {
      const dateA = new Date(a?.updatedAt || a?.createdAt || 0)
      const dateB = new Date(b?.updatedAt || b?.createdAt || 0)
      return dateB - dateA
    })
    .slice(0, 10)

  // Auto-logout if different user type tries to access
  useEffect(() => {
    if (userType && userType !== 'outlet_man') {
      handleLogout()
    }
  }, [userType])

  // Load completed orders if missing or on tab change
  useEffect(() => {
    if (activeTab === 'home' && (!lastFetched || orders.length === 0)) {
      loadCompletedOrders()
    }
  }, [activeTab, orders.length, lastFetched])

  const loadCompletedOrders = async () => {
    try {
      dispatch(setOutletLoading(true))
      const fetchedData = await getOrders()
      const orderList = Array.isArray(fetchedData?.orders) ? fetchedData.orders : (Array.isArray(fetchedData) ? fetchedData : [])
      dispatch(setOutletOrders(orderList))
    } catch (err) {
      console.error('Failed to load completed orders:', err)
    } finally {
      dispatch(setOutletLoading(false))
    }
  }

  const handleLogout = () => {
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
    setShowOrderDetails(false)

    try {
      // First, get order details without confirming
      // We'll need to modify the API or create a preview endpoint
      // For now, we'll scan and show details, then require confirmation
      const order = await scanOrderToken(scannedToken)
      
      // Check if order was already processed
      if (order.status === 'completed' || order.status === 'handed_over') {
        setPendingOrder(order)
        setShowOrderDetails(true)
      } else {
        // If order needs confirmation, show details popup
        setPendingOrder(order)
        setShowOrderDetails(true)
      }
      
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
    if (!pendingOrder) return

    setConfirming(true)
    try {
      // The scan already happened, we just need to refresh and close
      await loadCompletedOrders()
      setShowOrderDetails(false)
      setPendingOrder(null)
      setScanResult({
        success: true,
        message: getScanMessage(pendingOrder, tokenInput),
        order: pendingOrder
      })
    } catch (err) {
      setScanError(err.message || 'Failed to confirm')
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
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">Live Updates Active</span>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching orders...</p>
                </div>
              ) : completedOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-gray-400 font-medium">No completed orders found in recent history</p>
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
      </div>

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
