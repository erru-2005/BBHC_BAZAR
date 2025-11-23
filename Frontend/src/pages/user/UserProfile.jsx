import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaLocationDot, FaCalendarDays, FaBoxOpen, FaArrowLeft } from 'react-icons/fa6'
import { FaUserCircle, FaPhone, FaEnvelope, FaRegSave, FaSignOutAlt } from 'react-icons/fa'
import { getUserProfile, updateUserProfile } from '../../services/api'
import { setUser, logout } from '../../store/authSlice'
import MobileBottomNav from './components/MobileBottomNav'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function UserProfile() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: ''
  })
  const [loading, setLoading] = useState(true)
  const [savingField, setSavingField] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [pendingValue, setPendingValue] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const data = await getUserProfile()
        const formatted = {
          ...data,
          date_of_birth: formatDate(data.date_of_birth)
        }
        setProfile(formatted)
        dispatch(setUser(data))
      } catch (err) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  const startEditing = (field) => {
    setMessage(null)
    setError(null)
    setEditingField(field)
    setPendingValue(profile[field] || '')
  }

  const cancelEditing = () => {
    setEditingField(null)
    setPendingValue('')
  }

  const handleFieldSave = async (field) => {
    if (pendingValue === profile[field]) {
      setEditingField(null)
      return
    }

    setSavingField(field)
    setError(null)
    setMessage(null)
    try {
      const payload = { [field]: pendingValue }
      const response = await updateUserProfile(payload)
      dispatch(setUser(response.user))
      setProfile((prev) => ({ ...prev, [field]: pendingValue }))
      setMessage('Profile updated')
      setEditingField(null)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSavingField(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8 px-4 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Skeleton Header */}
          <section className="space-y-8 border-b border-gray-200 pb-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="text-center lg:text-left">
                {/* Skeleton Profile Icon */}
                <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse mx-auto lg:mx-0"></div>
                {/* Skeleton Name */}
                <div className="h-8 w-48 bg-gray-200 rounded mt-4 animate-pulse mx-auto lg:mx-0"></div>
                {/* Skeleton Email */}
                <div className="h-5 w-40 bg-gray-200 rounded mt-2 animate-pulse mx-auto lg:mx-0"></div>
              </div>
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skeleton Info Cards */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
                      <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Skeleton Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 h-12 bg-gray-200 rounded-2xl animate-pulse"></div>
              <div className="flex-1 h-12 bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>
          </section>

          {/* Skeleton Personal Information */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 rounded mb-6 animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded mt-1 animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-gray-200 rounded mb-2 animate-pulse"></div>
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 py-8 px-4 pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-amber-700 hover:text-amber-800 transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>

        <section className="space-y-8 border-b border-gray-200 pb-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="text-center lg:text-left">
              <FaUserCircle className="w-24 h-24 text-amber-700 mx-auto lg:mx-0" />
              <h1 className="text-3xl font-semibold tracking-tight mt-4 text-black">
                {profile.first_name || user?.first_name} {profile.last_name || user?.last_name}
              </h1>
              <p className="text-gray-600">{profile.email}</p>
            </div>
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50">
                <FaPhone className="w-5 h-5 text-amber-700" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Phone</p>
                  <p className="font-semibold text-black">{profile.phone_number || user?.phone_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50">
                <FaCalendarDays className="w-5 h-5 text-amber-700" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Member Since</p>
                  <p className="font-semibold text-black">{formatDate(user?.created_at)}</p>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-start gap-3 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50">
                <FaLocationDot className="w-5 h-5 text-amber-700 mt-1" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Address</p>
                  <p className="font-semibold text-black">{profile.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/user/orders')}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 border border-amber-400 text-black font-semibold py-3 hover:bg-amber-500 transition"
            >
              <FaBoxOpen className="text-amber-700" />
              View Orders
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 border border-red-500 text-white font-semibold py-3 hover:bg-red-600 transition"
            >
              <FaSignOutAlt className="text-white" />
              Logout
            </button>
          </div>
        </section>

        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">Personal Information</h2>
              <p className="text-sm text-gray-600">Tap the pencil icon on any field to edit it.</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'first_name', label: 'First Name', icon: FaUserCircle, editable: true },
              { key: 'last_name', label: 'Last Name', icon: FaUserCircle, editable: true },
              { key: 'email', label: 'Email', icon: FaEnvelope, editable: true, type: 'email' },
              { key: 'phone_number', label: 'Phone Number', icon: FaPhone, editable: false },
              { key: 'address', label: 'Address', icon: FaLocationDot, editable: true, textarea: true },
              { key: 'date_of_birth', label: 'Date of Birth (DD-MM-YYYY)', icon: FaCalendarDays, editable: true }
            ].map((field) => {
              const FieldIcon = field.icon
              const value = profile[field.key] || ''
              const isEditing = editingField === field.key
              return (
                <div
                  key={field.key}
                  className="border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <FieldIcon className="text-amber-700 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-widest text-gray-500">{field.label}</p>
                        {!isEditing ? (
                          <p className="font-medium text-black mt-1">
                            {value || <span className="italic text-gray-400">Not provided</span>}
                          </p>
                        ) : field.textarea ? (
                          <textarea
                            rows={3}
                            value={pendingValue}
                            onChange={(e) => setPendingValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 bg-white text-black focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={pendingValue}
                            onChange={(e) => setPendingValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 bg-white text-black focus:outline-none focus:ring-2 focus:ring-amber-400"
                            maxLength={field.key === 'date_of_birth' ? 10 : undefined}
                            placeholder={field.key === 'date_of_birth' ? 'DD-MM-YYYY' : undefined}
                          />
                        )}

                        {field.key === 'phone_number' && (
                          <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed.</p>
                        )}
                      </div>
                    </div>

                    {field.editable && !isEditing && (
                      <button
                        onClick={() => startEditing(field.key)}
                        className="text-sm font-medium text-amber-600 hover:text-amber-500 rounded-full px-3 py-1 border border-amber-200"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {field.editable && isEditing && (
                    <div className="flex flex-col sm:flex-row gap-3 mt-3">
                      <button
                        onClick={() => handleFieldSave(field.key)}
                        disabled={savingField === field.key || pendingValue.trim() === ''}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl transition disabled:opacity-60"
                      >
                        <FaRegSave />
                        {savingField === field.key ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold py-2 rounded-xl hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3">
              {message}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}

export default UserProfile

