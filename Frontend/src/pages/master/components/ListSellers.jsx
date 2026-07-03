/**
 * List Sellers Component
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import {
  getSellers,
  updateSeller,
  blacklistSeller,
  initiateSellerCreditOtp,
  confirmSellerCredits,
} from '../../../services/api'
import { FiEdit2, FiTrash2, FiSearch, FiPlusCircle, FiList, FiCheckCircle } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { setMastersData, setMastersLoading, updateMasterSeller } from '../../../store/masterSlice'
import { syncSellerBlacklisted, isCacheStale, CACHE_TTL } from '../../../services/cacheSync'
import Portal from '../../../components/Portal'

const CreditCoin = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#coin_grad_master)" stroke="#EAB308" strokeWidth="0.5"/>
    <circle cx="12" cy="12" r="7" stroke="#FDE047" strokeWidth="1" strokeDasharray="2 2"/>
    <path d="M12 7V17M12 7L9 10M12 7L15 10" stroke="#854D0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="coin_grad_master" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047"/>
        <stop offset="1" stopColor="#EAB308"/>
      </linearGradient>
    </defs>
  </svg>
)

function ListSellers() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { sellers, loading: masterLoading, lastFetched } = useSelector(state => state.master)
  
  const loading = masterLoading.sellers
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSeller, setEditingSeller] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSeller, setDeletingSeller] = useState(null)
  
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditTarget, setCreditTarget] = useState(null)
  const [creditAmount, setCreditAmount] = useState(50)
  const [creditPasskey, setCreditPasskey] = useState('')
  const [creditStep, setCreditStep] = useState('form')
  const [creditOtp, setCreditOtp] = useState('')
  const [otpSessionId, setOtpSessionId] = useState('')
  const [creditAuthorization, setCreditAuthorization] = useState('')
  const [otpPhoneMasked, setOtpPhoneMasked] = useState('')

  const [creditSuccess, setCreditSuccess] = useState(null)
  const creditSuccessTimerRef = useRef(null)

  const dismissCreditSuccess = useCallback(() => {
    if (creditSuccessTimerRef.current) {
      clearTimeout(creditSuccessTimerRef.current)
      creditSuccessTimerRef.current = null
    }
    setCreditSuccess(null)
  }, [])

  useEffect(() => {
    if (!creditSuccess) return undefined
    creditSuccessTimerRef.current = setTimeout(dismissCreditSuccess, 5000)
    return () => {
      if (creditSuccessTimerRef.current) {
        clearTimeout(creditSuccessTimerRef.current)
        creditSuccessTimerRef.current = null
      }
    }
  }, [creditSuccess, dismissCreditSuccess])

  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    is_active: false
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isCacheStale(lastFetched.sellers, CACHE_TTL.master) || sellers.length === 0) {
      fetchSellers()
    }
  }, [lastFetched.sellers])

  const fetchSellers = async () => {
    try {
      dispatch(setMastersLoading({ field: 'sellers', loading: true }))
      setError(null)
      const data = await getSellers({ limit: 100 })
      const list = data.sellers || []
      dispatch(setMastersData({ field: 'sellers', data: list }))
    } catch (err) {
      setError(err.message || 'Failed to fetch sellers')
    } finally {
      dispatch(setMastersLoading({ field: 'sellers', loading: false }))
    }
  }

  const handleEdit = (seller) => {
    setEditingSeller(seller)
    setFormData({
      email: seller.email || '',
      phone_number: seller.phone_number || '',
      first_name: seller.first_name || '',
      last_name: seller.last_name || '',
      is_active: seller.is_active || false
    })
    setShowEditModal(true)
  }

  const handleDelete = (seller) => {
    setDeletingSeller(seller)
    setShowDeleteModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingSeller) return

    try {
      setSubmitting(true)
      await updateSeller(editingSeller.id || editingSeller._id, formData)
      
      // Update local Redux store instead of re-fetching everything
      dispatch(updateMasterSeller({ 
        ...(editingSeller.id ? { id: editingSeller.id } : { _id: editingSeller._id }),
        ...formData 
      }))
      
      setShowEditModal(false)
      setEditingSeller(null)
    } catch (err) {
      setError(err.message || 'Failed to update seller')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSeller) return

    try {
      setSubmitting(true)
      await blacklistSeller(deletingSeller.id || deletingSeller._id)

      syncSellerBlacklisted(deletingSeller.id || deletingSeller._id, {
        ...deletingSeller,
        blacklist: { reason: 'Blacklisted by master', blacklisted_at: new Date().toISOString() },
      })

      setShowDeleteModal(false)
      setDeletingSeller(null)
    } catch (err) {
      setError(err.message || 'Failed to blacklist seller')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreditSendOtp = async (e) => {
    e.preventDefault()
    if (submitting || !creditTarget || creditAmount <= 0) return
    if (!creditPasskey.trim()) {
      setError('Credit passkey is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const res = await initiateSellerCreditOtp(
        creditTarget.id || creditTarget._id,
        creditAmount,
        creditPasskey.trim()
      )
      setOtpSessionId(res.otp_session_id)
      setCreditAuthorization(res.credit_authorization)
      setOtpPhoneMasked(res.phone_masked || '')
      setCreditStep('otp')
      setCreditOtp('')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreditConfirm = async (e) => {
    e.preventDefault()
    if (submitting || !creditTarget || !otpSessionId || !creditOtp.trim()) return

    try {
      setSubmitting(true)
      setError(null)
      const response = await confirmSellerCredits(creditTarget.id || creditTarget._id, {
        amount: creditAmount,
        otp_session_id: otpSessionId,
        otp: creditOtp.trim(),
        credit_authorization: creditAuthorization,
      })

      dispatch(updateMasterSeller({
        ...(creditTarget.id ? { id: creditTarget.id } : { _id: creditTarget._id }),
        credits: response.credits,
      }))

      setCreditSuccess({
        tradeId: creditTarget.trade_id,
        amount: creditAmount,
        credits: response.credits,
        message: response.message || `Successfully added ${creditAmount} credits`,
      })
      closeCreditModal()
    } catch (err) {
      setError(err.message || 'Failed to add credits')
    } finally {
      setSubmitting(false)
    }
  }

  const openSellerWalletPage = (seller) => {
    const id = seller.id || seller._id
    navigate(`/master/sellers/${id}/wallet`, { state: { seller } })
  }

  const closeCreditModal = () => {
    if (submitting) return
    setShowCreditModal(false)
    setCreditTarget(null)
    setCreditAmount(50)
    setCreditPasskey('')
    setCreditStep('form')
    setCreditOtp('')
    setOtpSessionId('')
    setCreditAuthorization('')
    setOtpPhoneMasked('')
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const sellersList = useMemo(
    () => (Array.isArray(sellers) ? sellers : []),
    [sellers]
  )

  // Filter sellers based on search query
  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) {
      return sellersList
    }

    const query = searchQuery.toLowerCase().trim()
    return sellersList.filter(seller => {
      // Search across all attributes
      const tradeId = (seller.trade_id || '').toLowerCase()
      const email = (seller.email || '').toLowerCase()
      const phone = (seller.phone_number || '').toLowerCase()
      const firstName = (seller.first_name || '').toLowerCase()
      const lastName = (seller.last_name || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
      const status = seller.is_active ? 'active' : 'inactive'
      const createdDate = seller.created_at 
        ? new Date(seller.created_at).toLocaleDateString().toLowerCase()
        : ''

      return (
        tradeId.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        status.includes(query) ||
        createdDate.includes(query)
      )
    })
  }, [sellersList, searchQuery])

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <Skeleton height={36} width={200} />
          <Skeleton height={40} width={100} />
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton height={16} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton height={20} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Skeleton */}
        <div className="md:hidden space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Skeleton height={20} width={120} className="mb-2" />
                    <Skeleton height={16} width={100} />
                  </div>
                  <Skeleton height={24} width={60} borderRadius={9999} />
                </div>
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <Skeleton height={16} width="80%" />
                  <Skeleton height={16} width="70%" />
                  <Skeleton height={16} width="60%" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !showEditModal && !showDeleteModal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 max-w-md">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
          <button
            onClick={fetchSellers}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">List Sellers</h2>
        <button
          onClick={fetchSellers}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search sellers by trade ID, name, email, phone, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Found {filteredSellers.length} seller{filteredSellers.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {sellers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No sellers found</p>
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No sellers match your search "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 text-sm text-black hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSellers.map((seller) => (
                  <tr key={seller._id || seller.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seller.trade_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {seller.first_name || seller.last_name 
                        ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <CreditCoin size={16} />
                        <span className="font-bold">{seller.credits ?? 30}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {seller.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {seller.phone_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        seller.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {seller.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSellerWalletPage(seller)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View wallet & transactions"
                        >
                          <FiList className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreditTarget(seller)
                            setCreditStep('form')
                            setShowCreditModal(true)
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Add Credits"
                        >
                          <FiPlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(seller)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(seller)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete (Blacklist)"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredSellers.map((seller) => (
              <div key={seller._id || seller.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{seller.trade_id}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {seller.first_name || seller.last_name 
                          ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
                          : 'No name'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      seller.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {seller.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Email:</span> {seller.email}
                    </p>
                    {seller.phone_number && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Phone:</span> {seller.phone_number}
                      </p>
                    )}
                    {seller.created_at && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Created:</span> {new Date(seller.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openSellerWalletPage(seller)}
                      className="flex-1 min-w-[120px] px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FiList className="w-4 h-4" />
                      Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(seller)}
                      className="flex-1 min-w-[100px] px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(seller)}
                      className="flex-1 min-w-[100px] px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSeller && (
        <div className="master-modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="master-modal-panel bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Seller</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade ID
                  </label>
                  <input
                    type="text"
                    value={editingSeller.trade_id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active Status
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingSeller(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSeller && (
        <div className="master-modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="master-modal-panel bg-white rounded-xl shadow-xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Blacklist Seller</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to blacklist <strong>{deletingSeller.trade_id}</strong>? 
                This seller will not be able to login and will be hidden from all lists.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingSeller(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Blacklisting...' : 'Blacklist Seller'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreditModal && creditTarget && (
          <Portal>
            <div className="master-modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="master-modal-panel bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCoin size={28} />
                    <h3 className="text-xl font-bold text-gray-900">Add Seller Credits</h3>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                    Add credits to <strong>{creditTarget.trade_id}</strong>. Current balance: <strong>{creditTarget.credits ?? 30}</strong>
                  </p>
                  <form
                    onSubmit={creditStep === 'form' ? handleCreditSendOtp : handleCreditConfirm}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credit Amount
                      </label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[50, 100, 500].map(amt => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => setCreditAmount(amt)}
                            disabled={submitting || creditStep === 'otp'}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${
                              creditAmount === amt
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        min="1"
                        required
                        disabled={submitting || creditStep === 'otp'}
                        className="master-credit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold text-gray-900"
                      />
                    </div>

                    {creditStep === 'form' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Credit passkey <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="password"
                          value={creditPasskey}
                          onChange={(e) => setCreditPasskey(e.target.value)}
                          required
                          autoComplete="off"
                          disabled={submitting}
                          placeholder="Enter master credit passkey"
                          className="master-credit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          After passkey verification, a 6-digit OTP is sent to your master email only.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          OTP <span className="text-red-600">*</span>
                        </label>
                        <p className="text-xs text-amber-700 mb-2 font-medium">
                          The OTP has been sent to your email address {otpPhoneMasked || 'your email'}. You will get the OTP in email. Enter it to add credits.
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={creditOtp}
                          onChange={(e) => setCreditOtp(e.target.value.replace(/\D/g, ''))}
                          required
                          autoComplete="one-time-code"
                          disabled={submitting}
                          placeholder="6-digit OTP"
                          className="master-credit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold text-gray-900 tracking-widest text-center"
                        />
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setCreditStep('form')
                            setCreditOtp('')
                            setOtpSessionId('')
                            setCreditAuthorization('')
                          }}
                          className="text-xs text-indigo-600 font-semibold mt-2 hover:underline"
                        >
                          ← Change amount or resend OTP
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={closeCreditModal}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={
                          submitting ||
                          creditAmount <= 0 ||
                          (creditStep === 'form' && !creditPasskey.trim()) ||
                          (creditStep === 'otp' && creditOtp.length < 6)
                        }
                      >
                        {submitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                            {creditStep === 'form' ? 'Sending OTP...' : 'Adding...'}
                          </>
                        ) : creditStep === 'form' ? (
                          'Send OTP'
                        ) : (
                          'Confirm Credits'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creditSuccess && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={dismissCreditSuccess}
              role="presentation"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                className="master-modal-panel bg-white rounded-2xl shadow-2xl p-8 text-center cursor-pointer"
                role="alertdialog"
                aria-live="polite"
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <FiCheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Credits added</h3>
                <p className="text-gray-600 text-sm mb-1">{creditSuccess.message}</p>
                <p className="text-gray-800 font-semibold text-sm">
                  <strong>{creditSuccess.tradeId}</strong> · +{creditSuccess.amount} credits
                </p>
                <p className="text-emerald-700 font-bold mt-2">
                  New balance: {creditSuccess.credits}
                </p>
                <p className="text-xs text-gray-400 mt-4">Tap anywhere to close · auto-closes in 5s</p>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

    </div>
  )
}

export default ListSellers
