import { useEffect, useState } from 'react'
import { getBlacklistedSellers, unblacklistSeller } from '../../../services/api'

function BlacklistedSellers() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)

  const fetchSellers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBlacklistedSellers()
      setSellers(data)
    } catch (err) {
      setError(err.message || 'Failed to load blacklisted sellers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSellers()
  }, [])

  const handleUnblacklist = async (sellerId) => {
    setActionId(sellerId)
    setError(null)
    try {
      await unblacklistSeller(sellerId)
      await fetchSellers()
    } catch (err) {
      setError(err.message || 'Failed to remove seller from blacklist')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blacklisted Sellers</h2>
          <p className="text-sm text-gray-500">Manage sellers who are currently blacklisted.</p>
        </div>
        <button
          onClick={fetchSellers}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trade ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Name / Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Blacklisted At
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && sellers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading blacklisted sellers...
                </td>
              </tr>
            )}

            {!loading && sellers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No sellers are currently blacklisted.
                </td>
              </tr>
            )}

            {sellers.map((seller) => {
              const fullName = [seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'N/A'
              const reason = seller.blacklist?.reason || '—'
              const blacklistedAt = seller.blacklist?.blacklisted_at
                ? new Date(seller.blacklist.blacklisted_at).toLocaleString()
                : '—'

              return (
                <tr key={seller.id || seller.trade_id}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{seller.trade_id || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{fullName}</p>
                    <p className="text-gray-500 text-xs">{seller.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{seller.phone_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{reason}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{blacklistedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleUnblacklist(seller.id || seller._id)}
                      disabled={actionId === (seller.id || seller._id)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-semibold text-green-700 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                    >
                      {actionId === (seller.id || seller._id) ? 'Restoring...' : 'Unblacklist'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BlacklistedSellers


