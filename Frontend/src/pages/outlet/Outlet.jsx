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

function Outlet() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, userType } = useSelector((state) => state.auth)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [tokenInput, setTokenInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [completedOrders, setCompletedOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Auto-logout if different user type tries to access
  useEffect(() => {
    if (userType && userType !== 'outlet_man') {
      handleLogout()
    }
  }, [userType])

  // Load completed orders on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'home') {
      loadCompletedOrders()
    }
  }, [activeTab])

  const loadCompletedOrders = async () => {
    setLoadingOrders(true)
    try {
      const orders = await getOrders()
      // Filter completed orders and sort by most recent
      const completed = orders
        .filter(order => order.status === 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0)
          const dateB = new Date(b.updatedAt || b.createdAt || 0)
          return dateB - dateA
        })
        .slice(0, 10) // Show last 10 completed orders
      setCompletedOrders(completed)
    } catch (err) {
      console.error('Failed to load completed orders:', err)
    } finally {
      setLoadingOrders(false)
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
            {/* Brand Name - Pink Bazaar */}
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold">
                <span className="text-white">BBHC</span>
                <span className="text-[#f4369e]">Bazaar</span>
              </h1>
            </div>

            {/* Welcome Message */}
            {user && (
              <div className="flex items-center gap-2 text-sm text-white">
                <span>Welcome, <span className="font-medium">{outletManName}</span></span>
              </div>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="tab-button px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 select-none bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600 flex-shrink-0 z-10 min-w-[44px] min-h-[44px]"
              title="Open menu"
              aria-label="Open tab menu"
            >
              <FaBars className="w-5 h-5 flex-shrink-0 text-white" />
            </button>

            <button
              onClick={() => handleTabSelection('home')}
              className={`tab-button px-5 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 select-none ${
                activeTab === 'home'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <HiHome className="w-5 h-5 flex-shrink-0" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleTabSelection('orders')}
              className={`tab-button px-5 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 select-none ${
                activeTab === 'orders'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <FaShoppingBag className="w-5 h-5 flex-shrink-0" />
              <span>Orders</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'home' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Outlet Dashboard</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600">Scan or search orders by token</p>
            </div>

            {/* Token Search/Scan */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FaQrcode className="w-6 h-6 text-gray-700" />
                <h3 className="text-xl font-semibold text-gray-900">Token Scanner</h3>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTokenScan()}
                  placeholder="Enter token or scan QR code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={handleTokenScan}
                  disabled={scanning || !tokenInput.trim()}
                  className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaSearch className="w-4 h-4" />
                  {scanning ? 'Scanning...' : 'Scan'}
                </button>
              </div>

              {scanError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {scanError}
                </div>
              )}

              {scanResult && !showOrderDetails && (
                <div className={`p-4 rounded-lg text-sm ${
                  scanResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <p className="font-semibold mb-2">{scanResult.success ? 'Success' : 'Error'}</p>
                  <p>{scanResult.message}</p>
                  {scanResult.order && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-xs">Order #{scanResult.order.orderNumber}</p>
                      <p className="text-xs">Status: {scanResult.order.status}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recently Completed Orders Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently Completed Orders</h3>
              {loadingOrders ? (
                <div className="text-center py-8 text-gray-500">Loading orders...</div>
              ) : completedOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No completed orders yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Seller</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900 font-medium">{order.orderNumber}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {order.product?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {order.seller?.trade_id || order.seller?.first_name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {order.user?.name || order.user?.first_name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{order.quantity}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(order.updatedAt || order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
