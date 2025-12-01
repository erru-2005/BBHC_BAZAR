import { useEffect, useState } from 'react'
import { getBlacklistedSellers, unblacklistSeller, getBlacklistedOutletMen, unblacklistOutletMan } from '../../../services/api'

function BlacklistedSellers() {
  const [activeSubTab, setActiveSubTab] = useState('sellers')
  const [sellers, setSellers] = useState([])
  const [outletMen, setOutletMen] = useState([])
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

  const fetchOutletMen = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBlacklistedOutletMen()
      setOutletMen(data)
    } catch (err) {
      setError(err.message || 'Failed to load blacklisted outlet men')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSubTab === 'sellers') {
      fetchSellers()
    } else {
      fetchOutletMen()
    }
  }, [activeSubTab])

  const handleUnblacklistSeller = async (sellerId) => {
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

  const handleUnblacklistOutletMan = async (outletManId) => {
    setActionId(outletManId)
    setError(null)
    try {
      await unblacklistOutletMan(outletManId)
      await fetchOutletMen()
    } catch (err) {
      setError(err.message || 'Failed to remove outlet man from blacklist')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blacklisted Users</h2>
          <p className="text-sm text-gray-500">Manage blacklisted sellers and outlet men.</p>
        </div>
        <button
          onClick={() => activeSubTab === 'sellers' ? fetchSellers() : fetchOutletMen()}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('sellers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'sellers'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sellers
          </button>
          <button
            onClick={() => setActiveSubTab('outlet-men')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'outlet-men'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Outlet Men
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="overflow-x-auto">
        {activeSubTab === 'sellers' ? (
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
                        onClick={() => handleUnblacklistSeller(seller.id || seller._id)}
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
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Access Code
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
              {loading && outletMen.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading blacklisted outlet men...
                  </td>
                </tr>
              )}

              {!loading && outletMen.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No outlet men are currently blacklisted.
                  </td>
                </tr>
              )}

              {outletMen.map((outletMan) => {
                const fullName = [outletMan.first_name, outletMan.last_name].filter(Boolean).join(' ') || 'N/A'
                const reason = outletMan.blacklist?.reason || '—'
                const blacklistedAt = outletMan.blacklist?.blacklisted_at
                  ? new Date(outletMan.blacklist.blacklisted_at).toLocaleString()
                  : '—'

                return (
                  <tr key={outletMan.id || outletMan._id}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{outletMan.outlet_access_code || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">{fullName}</p>
                      <p className="text-gray-500 text-xs">{outletMan.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{outletMan.phone_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{reason}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{blacklistedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUnblacklistOutletMan(outletMan.id || outletMan._id)}
                        disabled={actionId === (outletMan.id || outletMan._id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-semibold text-green-700 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                      >
                        {actionId === (outletMan.id || outletMan._id) ? 'Restoring...' : 'Unblacklist'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default BlacklistedSellers


