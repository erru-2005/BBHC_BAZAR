import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyUserOTP } from '../../services/api'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../../store/authSlice'
import { FaArrowLeft } from 'react-icons/fa6'
import { FaEdit } from 'react-icons/fa'

function OTPVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [otpSessionId, setOtpSessionId] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneNumberMasked, setPhoneNumberMasked] = useState('')

  useEffect(() => {
    // Get data from navigation state
    if (location.state) {
      setOtpSessionId(location.state.otpSessionId)
      setPhoneNumber(location.state.phoneNumber)
      setPhoneNumberMasked(location.state.phoneNumberMasked)
    } else {
      // If no state, redirect back to phone entry
      navigate('/user/phone-entry')
    }
  }, [location, navigate])

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return // Only allow single digit
    
    const newOtp = [...otp]
    newOtp[index] = value.replace(/\D/g, '') // Only digits
    setOtp(newOtp)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      // Focus last input
      document.getElementById('otp-5')?.focus()
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join('')
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await verifyUserOTP(otpSessionId, otpString)
      
      if (response.user_exists) {
        // User exists - login successful
        dispatch(loginSuccess({
          user: response.user,
          token: response.token,
          userType: response.userType,
          refresh_token: response.refreshToken
        }))
        
        // Show success message and redirect
        alert('Login successful!')
        navigate('/')
      } else {
        // User doesn't exist - navigate to registration
        navigate('/user/register', {
          state: {
            phoneNumber: response.phone_number
          }
        })
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPhone = () => {
    navigate('/user/phone-entry')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131921] via-[#1a2332] to-[#131921] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/user/phone-entry')}
          className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Enter Verification Code</h1>
            <p className="text-white/70 mb-4">
              We sent a code to {phoneNumberMasked || phoneNumber}
            </p>
            <button
              onClick={handleEditPhone}
              className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm transition"
            >
              <FaEdit className="w-3 h-3" />
              <span>Edit phone number</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification

