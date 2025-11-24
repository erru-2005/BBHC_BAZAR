import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sendUserOTP } from '../../services/api'
import { FaPhone, FaArrowLeft } from 'react-icons/fa6'

function PhoneNumberEntry() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillPhone = useMemo(() => location.state?.prefillPhone || '', [location.state?.prefillPhone])
  const [phoneNumber, setPhoneNumber] = useState(prefillPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Get returnTo URL from location state
  const returnTo = location.state?.returnTo || '/'
  const message = location.state?.message

  useEffect(() => {
    setPhoneNumber(prefillPhone)
  }, [prefillPhone])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setLoading(true)
    try {
      const response = await sendUserOTP(phoneNumber)
      // Navigate to OTP verification page with session ID, phone number, and returnTo
      navigate('/user/verify-otp', {
        state: {
          otpSessionId: response.otp_session_id,
          phoneNumber: phoneNumber,
          phoneNumberMasked: response.phone_number,
          returnTo: returnTo
        }
      })
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '')
    setPhoneNumber(value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full lg:w-1/2 max-w-md lg:max-w-[420px] mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium uppercase tracking-wide">Back to Home</span>
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-[0_35px_80px_rgba(15,23,42,0.08)] p-8 sm:p-10">
          <div className="absolute inset-x-8 top-0 h-28 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 rounded-b-[40px] opacity-5 pointer-events-none" />
          <div className="relative text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900/90 text-white mb-5 shadow-lg shadow-gray-900/30">
              <FaPhone className="w-7 h-7" />
            </div>
            <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-2">Secure Sign In</p>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Enter Your Phone Number</h1>
            <p className="text-base text-gray-500">We'll send you a verification code</p>
            {message && (
              <p className="text-gray-900 font-medium mt-4 text-sm bg-gray-100 px-3 py-2 inline-flex rounded-full">
                {message}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="Enter your phone number"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/10 focus:border-gray-900 transition"
                maxLength={15}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phoneNumber || phoneNumber.length < 10}
              className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-colors duration-200 tracking-wide uppercase"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PhoneNumberEntry

