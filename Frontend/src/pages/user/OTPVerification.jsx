import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyUserOTP, sendUserOTP } from '../../services/api'
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
  const [returnTo, setReturnTo] = useState('/')
  const [resendTimer, setResendTimer] = useState(60)
  const [resendLoading, setResendLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

  useEffect(() => {
    // Get data from navigation state
    if (location.state) {
      setOtpSessionId(location.state.otpSessionId)
      setPhoneNumber(location.state.phoneNumber)
      setPhoneNumberMasked(location.state.phoneNumberMasked)
      setReturnTo(location.state.returnTo || '/')
    } else {
      // If no state, redirect back to phone entry
      navigate('/user/phone-entry')
    }
  }, [location, navigate])

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendTimer])

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

        navigate(returnTo || '/', { replace: true })
      } else {
        // User doesn't exist - navigate to registration
        navigate('/user/register', {
          state: {
            phoneNumber: response.phone_number,
            returnTo: returnTo
          }
        })
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return
    setResendLoading(true)
    setInfoMessage('')
    setError(null)

    try {
      const response = await sendUserOTP(phoneNumber)
      if (response?.otp_session_id) {
        setOtpSessionId(response.otp_session_id)
      }
      if (response?.phone_number) {
        setPhoneNumberMasked(response.phone_number)
      }
      setResendTimer(60)
      setInfoMessage('A new code has been sent to your phone.')
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleEditPhone = () => {
    navigate('/user/phone-entry', {
      state: {
        prefillPhone: phoneNumber,
        returnTo,
        message: 'Update your phone number'
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full lg:w-1/2 max-w-md lg:max-w-[420px] mx-auto">
        <button
          onClick={() => navigate('/user/phone-entry')}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium uppercase tracking-wide">Back</span>
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-[0_35px_80px_rgba(15,23,42,0.08)] p-8 sm:p-10">
          <div className="absolute inset-x-8 top-0 h-28 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 rounded-b-[40px] opacity-5 pointer-events-none" />
          <div className="relative text-center mb-8">
            <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-3">Two Step Security</p>
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">Enter Verification Code</h1>
            <p className="text-base text-gray-500 mb-4">
              We sent a code to <span className="font-semibold text-gray-900">{phoneNumberMasked || phoneNumber}</span>
            </p>
            <button
              onClick={handleEditPhone}
              className="inline-flex items-center gap-2 text-gray-900 font-medium text-sm border border-gray-900/20 rounded-full px-4 py-1.5 hover:bg-gray-900 hover:text-white transition"
            >
              <FaEdit className="w-3.5 h-3.5" />
              <span>Edit phone number</span>
            </button>
          </div>

          <div className="relative z-10 space-y-6">
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
                  className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/10 focus:border-gray-900 transition"
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}
            {infoMessage && !error && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-gray-700 text-sm text-center">{infoMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendTimer > 0 || resendLoading}
              className="w-full border border-gray-300 text-gray-900 font-medium py-3 rounded-xl disabled:text-gray-400 disabled:border-gray-200 hover:bg-gray-50 transition"
            >
              {resendLoading
                ? 'Resending...'
                : resendTimer > 0
                  ? `Resend code in 0:${String(resendTimer).padStart(2, '0')}`
                  : 'Resend verification code'}
            </button>

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-colors duration-200 tracking-wide uppercase"
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

