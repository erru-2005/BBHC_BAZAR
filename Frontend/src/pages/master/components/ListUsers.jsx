import { useState, useEffect, useMemo } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { getUsers, setUserSellPermission } from '../../../services/api'
import { FiEdit2, FiSearch, FiShoppingBag } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { setMastersData, setMastersLoading } from '../../../store/masterSlice'

function ListUsers() {
  const dispatch = useDispatch()
  const { users, loading: masterLoading, lastFetched } = useSelector(state => state.master)
  
  const loading = masterLoading.users
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [canSell, setCanSell] = useState(false)

  useEffect(() => {
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    const fetchedAt = lastFetched.users || 0
    if (users.length === 0 || now - fetchedAt > fiveMinutes) {
      fetchUsers()
    }
  }, [])

  const fetchUsers = async () => {
    try {
      dispatch(setMastersLoading({ field: 'users', loading: true }))
      setError(null)
      const data = await getUsers({ limit: 500 })
      const list = data.data?.users || data.users || []
      dispatch(setMastersData({ field: 'users', data: list }))
    } catch (err) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      dispatch(setMastersLoading({ field: 'users', loading: false }))
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setCanSell(user.can_sell || false)
    setError(null)
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      setSubmitting(true)
      const userId = editingUser._id || editingUser.id
      await setUserSellPermission(userId, { can_sell: canSell, linked_seller_id: null })

      const updatedUsers = users.map(u =>
        (u._id || u.id) === userId ? { ...u, can_sell: canSell, linked_seller_id: null } : u
      )
      dispatch(setMastersData({ field: 'users', data: updatedUsers }))
      setShowEditModal(false)
      setEditingUser(null)
    } catch (err) {
      setError(err.message || 'Failed to update user permissions')
    } finally {
      setSubmitting(false)
    }
  }

  const usersList = useMemo(() => (Array.isArray(users) ? users : []), [users])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersList
    const q = searchQuery.toLowerCase().trim()
    return usersList.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone_number || '').toLowerCase().includes(q) ||
      (u.rollNo || '').toLowerCase().includes(q)
    )
  }, [usersList, searchQuery])

  if (loading && usersList.length === 0) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <Skeleton height={36} width={200} />
          <Skeleton height={40} width={100} />
        </div>
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>{[...Array(5)].map((_, i) => <th key={i} className="px-4 py-3"><Skeleton height={16} /></th>)}</tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton height={20} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Manage Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            Toggle "Can Sell" to authorize a student to open their own seller store.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <FiShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          When you enable <strong>Can Sell</strong> for a student, a seller store is <strong>automatically created</strong> for them the first time they switch roles — no manual seller linking required.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by username, email, roll number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && !showEditModal && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {usersList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No users found</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-lg">No users match "{searchQuery}"</p>
          <button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 text-sm text-black hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username / Roll No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Can Sell</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user._id || user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    {user.rollNo && <p className="text-xs text-gray-400">{user.rollNo}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{user.phone_number || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.can_sell ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {user.can_sell ? '✓ Authorized' : 'Not authorized'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Seller Authorization"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="master-modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="master-modal-panel bg-white rounded-xl shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Seller Authorization</h3>
              <p className="text-sm text-gray-500 mb-5">
                Student: <strong className="text-gray-800">{editingUser.username}</strong>
                {editingUser.rollNo && <span className="ml-1 text-gray-400">({editingUser.rollNo})</span>}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-5">
                {/* Big toggle switch */}
                <label className="flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all select-none
                  border-gray-200 hover:border-gray-300"
                  style={{ borderColor: canSell ? '#000' : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${canSell ? 'bg-black' : 'bg-gray-100'}`}>
                      <FiShoppingBag className={`w-5 h-5 ${canSell ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Allow selling</p>
                      <p className="text-xs text-gray-500">A seller store is auto-created on first switch</p>
                    </div>
                  </div>
                  <div
                    onClick={() => setCanSell(v => !v)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${canSell ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${canSell ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </label>

                {canSell && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                    ✓ This student will be able to switch to their seller dashboard from their profile page.
                    A seller store will be created automatically using their student details.
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditingUser(null); setError(null) }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListUsers
