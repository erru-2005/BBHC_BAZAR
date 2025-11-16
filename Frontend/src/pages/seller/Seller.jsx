/**
 * Seller Dashboard Page Component
 */
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import { Button } from '../../components'

function Seller() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token } = useSelector((state) => state.auth)

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.trade_id || 'Seller'}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Seller Dashboard</h2>
          <p className="text-xl text-gray-600">Manage your products and sales here</p>
        </div>
      </div>
    </div>
  )
}

export default Seller

