import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaLocationDot, FaCalendarDays, FaBoxOpen, FaArrowLeft } from 'react-icons/fa6'
import { FaUserCircle, FaPhone, FaEnvelope, FaRegSave, FaSignOutAlt, FaCamera } from 'react-icons/fa'
import { getUserProfile, updateUserProfile, logoutUser, uploadAvatar } from '../../services/api'
import { setUser, logout } from '../../store/authSlice'
import { resolveImageUrl, compressToWebP } from '../../utils/image'
import { motion } from 'framer-motion'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
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
  const { home } = useSelector((state) => state.data)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      dispatch(logout())
      navigate('/')
    }
  }

  const [isUploading, setIsUploading] = useState(false)

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    setIsUploading(true)
    setError(null)
    setMessage(null)

    try {
      const compressedFile = await compressToWebP(file, 256, 256, 0.8)
      const uploadRes = await uploadAvatar(compressedFile, user?.id || user?._id)
      const imageUrl = uploadRes.url
      const response = await updateUserProfile({ image_url: imageUrl })
      dispatch(setUser(response.user))
      setProfile((prev) => ({ ...prev, image_url: imageUrl }))
      setMessage('Profile picture updated successfully')
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err.message || 'Failed to update profile picture')
    } finally {
      setIsUploading(false)
    }
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

    setError(null)
    setMessage(null)

    // Frontend validations
    if (field === 'phone_number') {
      if (!pendingValue || pendingValue.trim().length < 10) {
        setError('A valid phone number (at least 10 digits) is required')
        return
      }
    }

    if (field === 'date_of_birth') {
      const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/
      if (!dateRegex.test(pendingValue)) {
        setError('Date of birth must be in DD-MM-YYYY format')
        return
      }
      const [day, month, year] = pendingValue.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        setError('Please enter a valid date')
        return
      }
      // Calculate age internally
      const today = new Date()
      let age = today.getFullYear() - date.getFullYear()
      const m = today.getMonth() - date.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--
      }
      if (age < 15) {
        setError('Invalid DOB. Please enter your correct DOB.')
        return
      }
    }

    setSavingField(field)
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
          <div className="relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg animate-pulse">
            <div className="h-32 w-full bg-gray-200" />
            <div className="relative p-6 pt-0">
              <div className="relative -mt-12 flex justify-between items-end">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200" />
                <div className="flex gap-3 mb-2">
                  <div className="w-32 h-10 bg-gray-200 rounded-2xl" />
                  <div className="w-24 h-10 bg-gray-200 rounded-2xl" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="mt-6 grid grid-cols-3 items-center gap-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 h-20">
                <div className="h-full w-full bg-gray-200 rounded-xl" />
                <div className="h-full w-full bg-gray-200 rounded-xl" />
                <div className="h-full w-full bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>

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

  const avatarUrl = resolveImageUrl(profile?.image_url || user?.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.first_name || user?.first_name || 'U') + ' ' + (profile?.last_name || user?.last_name || ''))}&background=d97706&color=fff&size=128`

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 lg:pb-8">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg"
        >
          {/* Cover Image / Gradient */}
          <div className="h-32 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />

          <div className="relative p-6 pt-0">
            {/* Avatar & Action Buttons */}
            <div className="relative -mt-12 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4">
              <div className="relative group cursor-pointer w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <img
                    src={avatarUrl}
                    alt={`${profile.first_name || user?.first_name || 'User'}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Camera icon over profile */}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <FaCamera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Action Buttons (Orders, Logout) */}
              <div className="flex gap-3 mb-2 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/user/orders')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 border border-amber-400 text-black font-semibold px-5 py-2.5 hover:bg-amber-500 transition text-sm shadow-sm active:scale-95"
                >
                  <FaBoxOpen className="text-amber-700" />
                  View Orders
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 border border-red-500 text-white font-semibold px-5 py-2.5 hover:bg-red-600 transition text-sm shadow-sm active:scale-95"
                >
                  <FaSignOutAlt className="text-white" />
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-4 text-center sm:text-left min-w-0">
              {/* Name & Email */}
              <h3 className="text-2xl font-bold text-black break-words">
                {profile.first_name || user?.first_name} {profile.last_name || user?.last_name}
              </h3>
              <p className="text-sm text-gray-500 break-all">
                {profile.email || user?.email}
              </p>

              {/* Stats Section / Member Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-5 items-center justify-items-center gap-4 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                <div className="flex flex-col items-center gap-1 text-center md:col-span-1">
                  <div className="flex items-center gap-1.5">
                    <FaPhone className="h-4 w-4 text-amber-700 flex-shrink-0" />
                    <span className="font-semibold text-black text-sm">{profile.phone_number || user?.phone_number || 'N/A'}</span>
                  </div>
                  <span className="text-xs text-gray-500">Phone</span>
                </div>
                <div className="hidden md:block h-8 w-px bg-gray-200" />
                <div className="flex flex-col items-center gap-1 text-center md:col-span-1">
                  <div className="flex items-center gap-1.5">
                    <FaCalendarDays className="h-4 w-4 text-amber-700 flex-shrink-0" />
                    <span className="font-semibold text-black text-sm">{formatDate(user?.created_at)}</span>
                  </div>
                  <span className="text-xs text-gray-500">Member Since</span>
                </div>
                <div className="hidden md:block h-8 w-px bg-gray-200" />
                <div className="flex flex-col items-center gap-1 text-center md:col-span-1 w-full px-2">
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <FaLocationDot className="h-4 w-4 text-amber-700 flex-shrink-0" />
                    <span className="font-semibold text-black text-sm truncate max-w-[200px]" title={profile.address || 'Not provided'}>
                      {profile.address || 'Not provided'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Address</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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
              { key: 'email', label: 'Email', icon: FaEnvelope, editable: false, type: 'email' },
              { key: 'phone_number', label: 'Phone Number', icon: FaPhone, editable: true },
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FieldIcon className="text-amber-700 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-widest text-gray-500">{field.label}</p>
                        {!isEditing ? (
                          <p className="font-medium text-black mt-1 break-all">
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
                            onChange={(e) => {
                              // If editing phone number, only allow digits
                              const val = field.key === 'phone_number' ? e.target.value.replace(/\D/g, '') : e.target.value
                              setPendingValue(val)
                            }}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 bg-white text-black focus:outline-none focus:ring-2 focus:ring-amber-400"
                            maxLength={field.key === 'date_of_birth' ? 10 : (field.key === 'phone_number' ? 15 : undefined)}
                            placeholder={field.key === 'date_of_birth' ? 'DD-MM-YYYY' : (field.key === 'phone_number' ? 'Enter phone number' : undefined)}
                          />
                        )}

                        {field.key === 'email' && (
                          <p className="text-xs text-gray-500 mt-1">Email address cannot be changed.</p>
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

