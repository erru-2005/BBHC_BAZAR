/**
 * Add Master Component
 */
import { useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { registerMaster } from '../../../services/api'

function AddMaster({ onSuccess, onError }) {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone_number: '',
    address: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('You must be logged in to register a master. Please log in first.')
        setLoading(false)
        return
      }

      const response = await registerMaster(form)
      setSuccess(response.message || 'Master registered successfully!')
      
      // Reset form
      setForm({
        name: '',
        username: '',
        email: '',
        password: '',
        phone_number: '',
        address: ''
      })
      
      if (onSuccess) onSuccess(response)
    } catch (error) {
      let errorMessage = error.message || 'Failed to register master'
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.'
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'You do not have permission to register masters.'
      }
      setError(errorMessage)
      if (onError) onError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl">
        {loading ? (
          <>
            <Skeleton height={36} width={200} className="mb-6" />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-5">
                {/* Form Field Skeletons */}
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <Skeleton height={20} width={120} className="mb-2" />
                    <Skeleton height={42} borderRadius={8} />
                    {i === 4 && <Skeleton height={16} width="60%" className="mt-1" />}
                  </div>
                ))}
                {/* Textarea Field */}
                <div>
                  <Skeleton height={20} width={100} className="mb-2" />
                  <Skeleton height={80} borderRadius={8} />
                </div>
                {/* Submit Button Skeleton */}
                <Skeleton height={48} borderRadius={8} />
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Add Master</h2>
            
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-green-800 font-medium">{success}</p>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}
            
            {/* Master Registration Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter full name"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter username"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter email address"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter password"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="+919538820068"
              />
              <p className="mt-1 text-xs text-gray-500">Format: +[country code][number]</p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-none"
                placeholder="Enter address (optional)"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Master'}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  )
}

export default AddMaster

