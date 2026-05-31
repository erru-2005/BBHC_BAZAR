import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiCalendar,
  FiCreditCard,
  FiShoppingBag,
  FiStar,
  FiLayers,
  FiBriefcase,
} from 'react-icons/fi'
import { getSellerWalletOverview, bindPortalRealtimeSync } from '../../services/api'
import { resolveImageUrl } from '../../utils/image'
import './master.css'

const CreditCoin = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#swd_coin)" stroke="#EAB308" strokeWidth="0.5" />
    <path d="M12 7V17M12 7L9 10M12 7L15 10" stroke="#854D0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="swd_coin" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="1" stopColor="#EAB308" />
      </linearGradient>
    </defs>
  </svg>
)

function StatCard({ label, value, sub, accent = 'slate' }) {
  const accents = {
    amber: 'border-amber-200 bg-amber-50/80',
    emerald: 'border-emerald-200 bg-emerald-50/80',
    indigo: 'border-indigo-200 bg-indigo-50/80',
    slate: 'border-slate-200 bg-white',
  }
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accents[accent] || accents.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function formatInr(paise) {
  if (paise == null) return null
  return `₹${(Number(paise) / 100).toLocaleString('en-IN')}`
}

export default function SellerWalletDetail() {
  const { sellerId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const reduxSeller = useSelector((state) =>
    state.master.sellers.find((s) => String(s.id || s._id) === String(sellerId))
  )

  useEffect(() => {
    bindPortalRealtimeSync()
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sellerId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getSellerWalletOverview(sellerId, { limit: 200 })
        if (!cancelled) setData(res)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load seller wallet')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (sellerId) load()
    return () => { cancelled = true }
  }, [sellerId])

  const seller = data?.seller || location.state?.seller
  const profile = data?.profile
  const liveCredits = reduxSeller?.credits ?? seller?.credits ?? profile?.credits ?? 0
  const wallet = data?.wallet_stats
  const market = data?.marketplace_stats
  const transactions = data?.transactions || []

  const displayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name
    if (seller) {
      const n = `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
      return n || seller.trade_id
    }
    return 'Seller'
  }, [profile, seller])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 master-dashboard">
        Loading seller wallet…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 master-dashboard">
        <p className="text-lg font-semibold text-slate-700">{error || 'Seller not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/master/dashboard')}
          className="px-6 py-3 rounded-xl bg-black text-white font-semibold"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const avatarUrl = resolveImageUrl(profile?.image_url || seller?.image_url)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-16 master-dashboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-8">
        <button
          type="button"
          onClick={() => navigate('/master/dashboard', { state: { tab: 'list-sellers' } })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-black transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to sellers
        </button>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <CreditCoin size={36} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                  
                </p>
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 truncate">{displayName}</h1>
                <p className="text-slate-600 font-mono font-semibold mt-1">{profile?.trade_id || seller?.trade_id}</p>
                <span
                  className={`inline-flex mt-3 px-3 py-1 rounded-full text-xs font-bold ${
                    profile?.is_active ?? seller?.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {(profile?.is_active ?? seller?.is_active) ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 lg:gap-6 p-5 rounded-2xl bg-slate-900 master-on-dark text-white shrink-0">
              <CreditCoin size={40} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white">Current balance</p>
                <p className="text-4xl font-black tabular-nums text-white">
                  <motion.span
                    key={liveCredits}
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    {liveCredits}
                  </motion.span>
                </p>
                <p className="text-xs text-white/70 mt-1">credits</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {[
              { icon: FiMail, label: 'Email', value: profile?.email || seller?.email },
              { icon: FiPhone, label: 'Phone', value: profile?.phone_number || seller?.phone_number || '—' },
              {
                icon: FiCalendar,
                label: 'Joined',
                value: formatDateTime(profile?.created_at || seller?.created_at).split(',')[0],
              },
              { icon: FiBriefcase, label: 'Created by', value: profile?.created_by || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="px-5 py-4 flex items-start gap-3">
                <Icon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 break-all">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.header>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Wallet statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard
              accent="amber"
              label="Total transactions"
              value={wallet?.total_transactions ?? 0}
            />
            <StatCard
              accent="emerald"
              label="Master grants"
              value={`+${wallet?.master_grant_credits ?? 0}`}
              sub={`${wallet?.master_grant_count ?? 0} grants`}
            />
            <StatCard
              accent="indigo"
              label="Razorpay recharges"
              value={`+${wallet?.razorpay_credits ?? 0}`}
              sub={`${wallet?.razorpay_count ?? 0} payments · ₹${(wallet?.total_inr_spent ?? 0).toLocaleString('en-IN')}`}
            />
            <StatCard
              label="Products / Services"
              value={`${market?.product_count ?? 0} / ${market?.service_count ?? 0}`}
              sub={`${market?.order_count ?? 0} orders`}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Marketplace</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: FiShoppingBag, label: 'Orders', value: market?.order_count ?? 0 },
              { icon: FiLayers, label: 'Products', value: market?.product_count ?? 0 },
              { icon: FiBriefcase, label: 'Services', value: market?.service_count ?? 0 },
              {
                icon: FiStar,
                label: 'Avg rating',
                value: market?.total_ratings ? market.average_rating : '—',
                sub: market?.total_ratings ? `${market.total_ratings} reviews` : 'No ratings',
              },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                  <p className="text-xl font-black text-slate-900">{value}</p>
                  {sub && <p className="text-xs text-slate-500">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 lg:px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiCreditCard className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Transaction history</h2>
            </div>
            <p className="text-sm text-slate-500">
              {data.transactions_total ?? transactions.length} record
              {(data.transactions_total ?? transactions.length) !== 1 ? 's' : ''}
              <span className="text-indigo-600 font-medium"> · Master view only</span>
            </p>
          </div>

          {transactions.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">No wallet transactions recorded yet.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date & time', 'Type', 'Credits', 'Balance', 'Details'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {formatDateTime(tx.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                              tx.type === 'master_grant'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {tx.type_label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-emerald-700">+{tx.amount}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 tabular-nums">
                          {tx.balance_before} → {tx.balance_after}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 max-w-xs">
                          {tx.type === 'master_grant' && tx.master_username && (
                            <span>By {tx.master_username}</span>
                          )}
                          {tx.type === 'razorpay_recharge' && tx.razorpay_payment_id && (
                            <span className="block truncate" title={tx.razorpay_payment_id}>
                              Pay ID: {tx.razorpay_payment_id}
                              {tx.amount_inr_paise != null && (
                                <span className="block text-slate-400">
                                  Paid {formatInr(tx.amount_inr_paise)}
                                </span>
                              )}
                            </span>
                          )}
                          {tx.notes && <span className="block mt-1">{tx.notes}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'master_grant'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {tx.type_label}
                      </span>
                      <span className="text-lg font-black text-emerald-700">+{tx.amount}</span>
                    </div>
                    <p className="text-xs text-slate-500">{formatDateTime(tx.created_at)}</p>
                    <p className="text-xs text-slate-600">
                      Balance {tx.balance_before} → {tx.balance_after}
                    </p>
                    {tx.master_username && (
                      <p className="text-xs text-slate-500">Master: {tx.master_username}</p>
                    )}
                    {tx.razorpay_payment_id && (
                      <p className="text-xs text-slate-400 truncate">Payment: {tx.razorpay_payment_id}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
