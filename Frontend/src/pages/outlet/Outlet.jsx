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
import { FaShoppingBag, FaBars, FaSignOutAlt, FaSearch, FaQrcode } from 'react-icons/fa'
import OrdersList from '../master/components/OrdersList'
import { scanOrderToken, getOrder } from '../../services/api'

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

  // Auto-logout if different user type tries to access
  useEffect(() => {
    if (userType && userType !== 'outlet_man') {
      handleLogout()
    }
  }, [userType])

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

    setScanning(true)
    setScanError(null)
    setScanResult(null)

    try {
      const order = await scanOrderToken(tokenInput.trim())
      setScanResult({
        success: true,
        message: getScanMessage(order),
        order
      })
      setTokenInput('')
    } catch (err) {
      setScanResult({
        success: false,
        message: err.message || 'Failed to scan token'
      })
      setScanError(err.message || 'Failed to scan token')
    } finally {
      setScanning(false)
    }
  }

  const getScanMessage = (order) => {
    if (order.status === 'seller_accepted') {
      return 'Seller token scanned. Product has been handed over. User can now collect.'
    } else if (order.status === 'handed_over') {
      return 'User token scanned. Order completed successfully!'
    } else if (order.status === 'completed') {
      return 'Order already completed.'
    }
    return 'Token scanned successfully.'
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
          <div className="max-w-2xl mx-auto space-y-6">
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

              {scanResult && (
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

