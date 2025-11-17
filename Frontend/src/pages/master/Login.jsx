/**
 * Master Login Page Component
 * Neumorphic design login form
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginFailure } from '../../store/authSlice'
import { masterLogin, verifyOTP } from '../../services/api'
import { Button } from '../../components'
import { getOrCreateDeviceId, getDeviceToken, setDeviceToken } from '../../utils/device'
import { initSocket } from '../../utils/socket'

function MasterLogin() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { loading, error } = useSelector((state) => state.auth)
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSessionId, setOtpSessionId] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState(null)

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
      if (!formData.username || !formData.password) {
        dispatch(loginFailure('Username and password are required'))
        return
      }

      // Get or create device ID
      const deviceId = getOrCreateDeviceId()
      // Only use device token if it's for master user type
      const storedUserType = localStorage.getItem('bbhc_device_user_type')
      const deviceToken = (storedUserType === 'master') ? getDeviceToken() : null

      // Step 1: Validate credentials and check device token
      console.log('Attempting login with:', { 
        username: formData.username, 
        deviceId, 
        hasDeviceToken: !!deviceToken,
        storedUserType,
        deviceToken: deviceToken ? deviceToken.substring(0, 20) + '...' : null
      })
      const response = await masterLogin(formData.username, formData.password, deviceId, deviceToken)
      console.log('Login response:', {
        hasAccessToken: !!response.access_token,
        skipOtp: response.skip_otp,
        hasOtpSessionId: !!response.otp_session_id,
        response: response
      })
      
      // Check if device token was valid (skip OTP) - check for access_token presence
      if (response.access_token && (response.skip_otp || !response.otp_session_id)) {
        console.log('Skipping OTP, navigating to dashboard')
        
        // Save device token if returned from backend (for device_id-only login)
        if (response.device_token) {
          setDeviceToken(response.device_token, deviceId, 'master')
        }
        
        // Device token valid, login directly
        dispatch(loginSuccess({
          user: response.user,
          token: response.access_token,
          userType: response.userType || 'master',
          refresh_token: response.refresh_token
        }))
        
        // Initialize socket connection and notify server (this will save socket_id to DB)
        const socket = initSocket(response.access_token)
        socket.on('connect', () => {
          console.log('Socket connected, emitting user_authenticated')
          socket.emit('user_authenticated', {
            user_id: response.user.id,
            user_type: 'master'
          })
        })
        
        // Navigate to dashboard
        navigate('/master')
        return
      }
      
      // Device token invalid or not present, proceed with OTP flow
      if (!response.otp_session_id) {
        dispatch(loginFailure('OTP session ID not received. Please try again.'))
        return
      }
      
      setOtpSessionId(response.otp_session_id)
      setPhoneNumber(response.phone_number || null)
      setShowOTP(true)
      dispatch(loginFailure(null)) // Clear any previous errors
      
    } catch (error) {
      dispatch(loginFailure(error.message || 'Login failed. Please check your credentials.'))
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    dispatch(loginStart())
    
    try {
      if (!otp || otp.length !== 6) {
        dispatch(loginFailure('Please enter a valid 6-digit OTP'))
        return
      }

      // Get device ID for device token creation
      const deviceId = getOrCreateDeviceId()

      // Step 2: Verify OTP and get JWT tokens
      const response = await verifyOTP(otpSessionId, otp, deviceId)
      
      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
        userType: response.userType,
        refresh_token: response.refreshToken
      }))
      
      // Initialize socket connection and notify server (this will save socket_id to DB)
      const socket = initSocket(response.token)
      socket.on('connect', () => {
        console.log('Socket connected after OTP, emitting user_authenticated')
        socket.emit('user_authenticated', {
          user_id: response.user.id,
          user_type: 'master'
        })
      })
      
      navigate('/master')
    } catch (error) {
      dispatch(loginFailure(error.message || 'OTP verification failed. Please try again.'))
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md sm:max-w-lg md:max-w-xl lg:w-[600px] xl:w-[700px]">
        {/* Neumorphic Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
          {/* User Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-black  flex items-center justify-center">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">
            MASTER LOGIN
          </h1>
          <p className="text-sm text-gray-600 text-center mb-8">
            Secure access for BBHCBazaar master administrators
          </p>

          {/* Form */}
          {!showOTP ? (
            <form onSubmit={handleSubmit}>
              {/* Username Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username"
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
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit}>
              {/* Success Message */}
              <div className="mb-6 p-3 rounded-lg bg-green-50 text-green-600 text-sm text-center">
                {phoneNumber ? (
                  <>OTP sent successfully to {phoneNumber}! Please enter the 6-digit code below.</>
                ) : (
                  <>OTP sent successfully! Please enter the 6-digit code below.</>
                )}
              </div>

              {/* OTP Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-800 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff] transition-all text-center text-2xl tracking-widest font-semibold"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Enter the 6-digit verification code
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl bg-gray-100 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] text-pink-500 font-semibold text-lg hover:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP'}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOTP(false)
                  setOtp('')
                  setOtpSessionId(null)
                  setPhoneNumber(null)
                  dispatch(loginFailure(null))
                }}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}

          {/* Footer Links */}
          <div className="text-center space-x-2">
            <button className="text-pink-500 hover:text-pink-600 text-sm font-medium transition-colors">
              Forgot password?
            </button>
          
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterLogin

