import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { registerUserPhone } from '../../services/api'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../../store/authSlice'
import { FaArrowLeft, FaUser, FaEnvelope } from 'react-icons/fa6'
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa'

function UserRegistration() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  
  const [formData, setFormData] = useState({
    phone_number: '',
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    date_of_birth: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    // Get phone number from navigation state
    if (location.state?.phoneNumber) {
      setFormData(prev => ({
        ...prev,
        phone_number: location.state.phoneNumber
      }))
    } else {
      // If no phone number, redirect back
      navigate('/user/phone-entry')
    }
  }, [location, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.address.trim()) {
      setError('Address is required')
      return false
    }
    if (!formData.date_of_birth) {
      setError('Date of birth is required')
      return false
    }
    
    // Validate date format (DD-MM-YYYY)
    const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/
    if (!dateRegex.test(formData.date_of_birth)) {
      setError('Date of birth must be in DD-MM-YYYY format')
      return false
    }

    // Validate date is valid
    const [day, month, year] = formData.date_of_birth.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      setError('Please enter a valid date')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await registerUserPhone(formData)
      
      // Dispatch login success
      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
        userType: response.userType,
        refresh_token: response.refreshToken
      }))
      
      // Show success popup
      setShowSuccess(true)
      
      // Get returnTo from location state or default to home
      const returnTo = location.state?.returnTo || '/'
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(returnTo)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131921] via-[#1a2332] to-[#131921] flex items-center justify-center p-4">
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registered Successfully!</h2>
            <p className="text-gray-600">Redirecting to home page...</p>
          </div>
        </div>
      )}

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
            <h1 className="text-3xl font-bold text-white mb-2">Complete Registration</h1>
            <p className="text-white/70">Please fill in your details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-white/90 mb-2">
                <FaUser className="inline w-4 h-4 mr-2" />
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-white/90 mb-2">
                <FaUser className="inline w-4 h-4 mr-2" />
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                <FaEnvelope className="inline w-4 h-4 mr-2" />
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-white/90 mb-2">
                <FaMapMarkerAlt className="inline w-4 h-4 mr-2" />
                Address *
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-white/90 mb-2">
                <FaCalendarAlt className="inline w-4 h-4 mr-2" />
                Date of Birth (DD-MM-YYYY) *
              </label>
              <input
                type="text"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                placeholder="DD-MM-YYYY"
                pattern="\d{2}-\d{2}-\d{4}"
                maxLength={10}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
              <p className="text-white/60 text-xs mt-1">Format: DD-MM-YYYY (e.g., 25-12-1990)</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserRegistration

