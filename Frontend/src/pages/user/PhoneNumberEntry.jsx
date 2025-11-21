import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendUserOTP } from '../../services/api'
import { FaPhone, FaArrowLeft } from 'react-icons/fa6'

function PhoneNumberEntry() {
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      // Navigate to OTP verification page with session ID and phone number
      navigate('/user/verify-otp', {
        state: {
          otpSessionId: response.otp_session_id,
          phoneNumber: phoneNumber,
          phoneNumberMasked: response.phone_number
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
    <div className="min-h-screen bg-gradient-to-br from-[#131921] via-[#1a2332] to-[#131921] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/20 mb-4">
              <FaPhone className="w-8 h-8 text-pink-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Enter Your Phone Number</h1>
            <p className="text-white/70">We'll send you a verification code</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-white/90 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phoneNumber || phoneNumber.length < 10}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
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

