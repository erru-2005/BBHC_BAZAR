/**
 * Outlet Man Login Page Component
 * Neumorphic design login form
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure, logout } from '../../store/authSlice'
import { outletManLogin } from '../../services/api'
import { getOrCreateDeviceId, getDeviceToken, setDeviceToken } from '../../utils/device'
import { initSocket, disconnectSocket } from '../../utils/socket'

function OutletLogin() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { loading, error, userType, isAuthenticated } = useSelector((state) => state.auth)
  
  useEffect(() => {
    // If already logged in as outlet_man, go straight to dashboard
    if (isAuthenticated && userType === 'outlet_man') {
      navigate('/outlet/dashboard', { replace: true })
      return
    }

    // Auto-logout if different user type is logged in
    if (userType && userType !== 'outlet_man') {
      dispatch(logout())
      disconnectSocket()
    }
  }, [userType, isAuthenticated, dispatch, navigate])
  
  const [formData, setFormData] = useState({
    outlet_access_code: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(loginStart())
    
    try {
      if (!formData.outlet_access_code || !formData.password) {
        dispatch(loginFailure('Outlet access code and password are required'))
        return
      }

      // Get or create device ID
      const deviceId = getOrCreateDeviceId()
      // Only use device token if it's for outlet_man user type
      const storedUserType = localStorage.getItem('bbhc_device_user_type')
      const deviceToken = (storedUserType === 'outlet_man') ? getDeviceToken() : null

      // Validate credentials and login directly (no OTP for outlet man)
      const response = await outletManLogin(formData.outlet_access_code, formData.password, deviceId, deviceToken)
      
      // Save device token if returned from backend
      if (response.device_token) {
        setDeviceToken(response.device_token, deviceId, 'outlet_man')
      }
      
      // Login directly
      dispatch(loginSuccess({
        user: response.user,
        token: response.access_token,
        userType: response.userType || 'outlet_man',
        refresh_token: response.refresh_token
      }))
      
      // Initialize socket connection and notify server (this will save socket_id to DB)
      const socket = initSocket(response.access_token)
      socket.on('connect', () => {
        socket.emit('user_authenticated', {
          user_id: response.user.id,
          user_type: 'outlet_man'
        })
      })
      
      // Navigate to dashboard
      navigate('/outlet/dashboard')
      
    } catch (error) {
      dispatch(loginFailure(error.message || 'Login failed. Please check your credentials.'))
    }
  }


  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md sm:max-w-lg md:max-w-xl lg:w-[600px] xl:w-[700px]">
        {/* Neumorphic Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
          {/* User Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-2">
            OUTLET LOGIN
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 text-center mb-8">
            Secure access for BBHCBazaar outlet managers
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
              {/* Outlet Access Code Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Access Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="outlet_access_code"
                    value={formData.outlet_access_code}
                    onChange={handleChange}
                    placeholder="Outlet Access Code"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-800 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff] transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-800 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff] transition-all pr-12"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gray-100 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] text-pink-500 font-semibold text-lg hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
        </div>
      </div>
    </div>
  )
}

export default OutletLogin

