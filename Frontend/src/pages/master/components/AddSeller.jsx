/**
 * Add Seller Component — Premium mobile-responsive design
 */
import { useState } from 'react'
import { registerSeller } from '../../../services/api'
import { useDispatch } from 'react-redux'
import { invalidateMasterCache } from '../../../store/masterSlice'
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiTag,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiUserPlus,
} from 'react-icons/fi'

function FormField({ label, required, hint, error, icon: Icon, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        {children}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><FiAlertCircle className="w-3 h-3 flex-shrink-0" />{error}</p>}
    </div>
  )
}

function AddSeller({ onSuccess, onError }) {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    trade_id: '',
    email: '',
    password: '',
    phone_number: '',
    first_name: '',
    last_name: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const inputBase =
    'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition text-sm text-gray-900 placeholder:text-gray-400'

  const validate = () => {
    const errors = {}
    if (!form.trade_id.trim()) errors.trade_id = 'Trade ID is required'
    else if (!/^[A-Za-z0-9_-]+$/.test(form.trade_id)) errors.trade_id = 'Only letters, numbers, hyphens and underscores'
    if (!form.email.trim()) errors.email = 'Email is required'
    if (!form.password) errors.password = 'Password is required'
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters'
    if (!form.phone_number.trim()) errors.phone_number = 'Phone number is required'
    else if (!/^\+\d{7,15}$/.test(form.phone_number)) errors.phone_number = 'Use format: +[country code][number]'
    return errors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('You must be logged in to register a seller.')
        return
      }

      const response = await registerSeller(form)
      dispatch(invalidateMasterCache(['sellers']))
      setSuccess(response.message || 'Seller registered successfully!')
      setForm({ trade_id: '', email: '', password: '', phone_number: '', first_name: '', last_name: '' })
      setFieldErrors({})
      if (onSuccess) onSuccess(response)
    } catch (err) {
      let msg = err.message || 'Failed to register seller'
      if (msg.includes('401') || msg.includes('Unauthorized')) msg = 'Authentication failed. Please log in again.'
      else if (msg.includes('403') || msg.includes('Forbidden')) msg = 'Only masters can register sellers.'
      setError(msg)
      if (onError) onError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-1">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <FiUserPlus className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Add Seller</h2>
            <p className="text-sm text-gray-400">Register a new seller account</p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 animate-fade-in">
          <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Section: Account Identity */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Account Identity</p>
            <div className="space-y-4">
              <FormField label="Trade ID" required hint="Alphanumeric, hyphens and underscores only" error={fieldErrors.trade_id} icon={FiTag}>
                <input
                  type="text"
                  name="trade_id"
                  value={form.trade_id}
                  onChange={handleChange}
                  placeholder="e.g. seller-001"
                  className={inputBase}
                  autoCapitalize="none"
                  autoComplete="off"
                />
              </FormField>

              <FormField label="Email" required error={fieldErrors.email} icon={FiMail}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seller@example.com"
                  className={inputBase}
                  autoComplete="email"
                  inputMode="email"
                />
              </FormField>

              <FormField label="Password" required error={fieldErrors.password} icon={FiLock}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`${inputBase} pr-11`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </FormField>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="px-5 pt-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact</p>
            <FormField label="Phone Number" required hint="Include country code: +919538820068" error={fieldErrors.phone_number} icon={FiPhone}>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="+91XXXXXXXXXX"
                className={inputBase}
                inputMode="tel"
                autoComplete="tel"
              />
            </FormField>
          </div>

          {/* Section: Profile */}
          <div className="px-5 pt-4 pb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Profile (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" icon={FiUser}>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="First"
                  className={inputBase}
                  autoComplete="given-name"
                />
              </FormField>
              <FormField label="Last Name" icon={FiUser}>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Last"
                  className={inputBase}
                  autoComplete="family-name"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-2xl shadow-md shadow-amber-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Registering Seller...
            </>
          ) : (
            <>
              <FiUserPlus className="w-5 h-5" />
              Register Seller
            </>
          )}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">
          The seller will receive their login credentials via email.
        </p>
      </form>
    </div>
  )
}

export default AddSeller
