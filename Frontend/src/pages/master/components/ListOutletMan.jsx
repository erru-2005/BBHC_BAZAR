/**
 * List Outlet Man Component
 */
import { useState, useEffect, useMemo } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { getOutletMen, updateOutletMan, blacklistOutletMan } from '../../../services/api'
import { FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'

function ListOutletMan() {
  const [outletMen, setOutletMen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingOutletMan, setEditingOutletMan] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingOutletMan, setDeletingOutletMan] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    is_active: false
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchOutletMen()
  }, [])

  const fetchOutletMen = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOutletMen()
      const list =
        Array.isArray(data?.outlet_men) ? data.outlet_men :
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data) ? data : []
      setOutletMen(list)
    } catch (err) {
      setError(err.message || 'Failed to fetch outlet men')
      setOutletMen([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (outletMan) => {
    setEditingOutletMan(outletMan)
    setFormData({
      email: outletMan.email || '',
      phone_number: outletMan.phone_number || '',
      first_name: outletMan.first_name || '',
      last_name: outletMan.last_name || '',
      is_active: outletMan.is_active || false
    })
    setShowEditModal(true)
  }

  const handleDelete = (outletMan) => {
    setDeletingOutletMan(outletMan)
    setShowDeleteModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingOutletMan) return

    try {
      setSubmitting(true)
      await updateOutletMan(editingOutletMan.id || editingOutletMan._id, formData)
      setShowEditModal(false)
      setEditingOutletMan(null)
      await fetchOutletMen() // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to update outlet man')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingOutletMan) return

    try {
      setSubmitting(true)
      await blacklistOutletMan(deletingOutletMan.id || deletingOutletMan._id)
      setShowDeleteModal(false)
      setDeletingOutletMan(null)
      await fetchOutletMen() // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to blacklist outlet man')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const outletMenList = useMemo(
    () => (Array.isArray(outletMen) ? outletMen : []),
    [outletMen]
  )

  // Filter outlet men based on search query
  const filteredOutletMen = useMemo(() => {
    if (!searchQuery.trim()) {
      return outletMenList
    }

    const query = searchQuery.toLowerCase().trim()
    return outletMenList.filter(outletMan => {
      // Search across all attributes
      const accessCode = (outletMan.outlet_access_code || '').toLowerCase()
      const email = (outletMan.email || '').toLowerCase()
      const phone = (outletMan.phone_number || '').toLowerCase()
      const firstName = (outletMan.first_name || '').toLowerCase()
      const lastName = (outletMan.last_name || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
      const status = outletMan.is_active ? 'active' : 'inactive'
      const createdDate = outletMan.created_at 
        ? new Date(outletMan.created_at).toLocaleDateString().toLowerCase()
        : ''

      return (
        accessCode.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        status.includes(query) ||
        createdDate.includes(query)
      )
    })
  }, [outletMenList, searchQuery])

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
            onClick={fetchOutletMen}
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
        <h2 className="text-3xl font-bold text-gray-900">List Outlet Men</h2>
        <button
          onClick={fetchOutletMen}
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
            placeholder="Search outlet men by access code, name, email, phone, status..."
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
            Found {filteredOutletMen.length} outlet man{filteredOutletMen.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {outletMen.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No outlet men found</p>
        </div>
      ) : filteredOutletMen.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No outlet men match your search "{searchQuery}"</p>
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
                    Access Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
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
                    Created At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOutletMen.map((outletMan) => (
                  <tr key={outletMan._id || outletMan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {outletMan.outlet_access_code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {outletMan.first_name || outletMan.last_name 
                        ? `${outletMan.first_name || ''} ${outletMan.last_name || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {outletMan.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {outletMan.phone_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        outletMan.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outletMan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {outletMan.created_at 
                        ? new Date(outletMan.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(outletMan)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(outletMan)}
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
            {filteredOutletMen.map((outletMan) => (
              <div key={outletMan._id || outletMan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{outletMan.outlet_access_code}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {outletMan.first_name || outletMan.last_name 
                          ? `${outletMan.first_name || ''} ${outletMan.last_name || ''}`.trim()
                          : 'No name'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      outletMan.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {outletMan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Email:</span> {outletMan.email}
                    </p>
                    {outletMan.phone_number && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Phone:</span> {outletMan.phone_number}
                      </p>
                    )}
                    {outletMan.created_at && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Created:</span> {new Date(outletMan.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleEdit(outletMan)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(outletMan)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
      {showEditModal && editingOutletMan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Outlet Man</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outlet Access Code
                  </label>
                  <input
                    type="text"
                    value={editingOutletMan.outlet_access_code}
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
                      setEditingOutletMan(null)
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
      {showDeleteModal && deletingOutletMan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Blacklist Outlet Man</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to blacklist <strong>{deletingOutletMan.outlet_access_code}</strong>? 
                This outlet man will not be able to login and will be hidden from all lists.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingOutletMan(null)
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
                  {submitting ? 'Blacklisting...' : 'Blacklist Outlet Man'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListOutletMan

