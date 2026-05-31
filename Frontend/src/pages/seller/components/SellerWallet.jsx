import { motion } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { FiDollarSign, FiArrowUpRight, FiClock, FiPlus, FiCreditCard } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import {
  createRazorpayRechargeOrder,
  verifyRazorpayRechargePayment,
  getMyWalletTransactions,
} from '../../../services/api'
import { updateUserInfo } from '../../../store/authSlice'

const CreditCoin = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#wallet_coin_grad)" stroke="#EAB308" strokeWidth="0.5"/>
    <circle cx="12" cy="12" r="7" stroke="#FDE047" strokeWidth="1" strokeDasharray="2 2"/>
    <path d="M12 7V17M12 7L9 10M12 7L15 10" stroke="#854D0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="wallet_coin_grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047"/>
        <stop offset="1" stopColor="#EAB308"/>
      </linearGradient>
    </defs>
  </svg>
)

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'))
    document.body.appendChild(script)
  })

export default function SellerWallet() {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [amount, setAmount] = useState(100)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setTxLoading(true)
      try {
        const res = await getMyWalletTransactions({ limit: 30 })
        if (!cancelled) setTransactions(res.transactions || [])
      } catch {
        if (!cancelled) setTransactions([])
      } finally {
        if (!cancelled) setTxLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.credits])

  const formatTxDate = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return iso
    }
  }

  const handleProceedToRecharge = async () => {
    if (amount <= 0) return
    setLoading(true)
    setMessage(null)

    try {
      await loadRazorpayScript()
      const order = await createRazorpayRechargeOrder(amount)

      if (!order?.key_id || !order?.order_id) {
        throw new Error('Invalid payment order response from server')
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'BBHC Bazaar',
        description: `Wallet recharge — ${order.credits} credits`,
        order_id: order.order_id,
        prefill: {
          name: order.seller_name || user?.name || '',
          email: order.seller_email || user?.email || '',
          contact: order.seller_phone || user?.phone_number || ''
        },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            const verified = await verifyRazorpayRechargePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
            dispatch(updateUserInfo({ credits: verified.credits }))
            setMessage({
              type: 'success',
              text: verified.message || `Successfully added ${order.credits} credits!`
            })
            setAmount(100)
            try {
              const txRes = await getMyWalletTransactions({ limit: 30 })
              setTransactions(txRes.transactions || [])
            } catch {
              /* ignore refresh error */
            }
          } catch (err) {
            setMessage({ type: 'error', text: err.message })
          } finally {
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setMessage({ type: 'error', text: 'Payment cancelled' })
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (err) => {
        setLoading(false)
        const reason = err?.error?.description || 'Payment failed. Please try again.'
        setMessage({ type: 'error', text: reason })
      })
      razorpay.open()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto w-full space-y-8">
      <section className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF3399]/10 rounded-full blur-[100px] -ml-32 -mb-32" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-blue-400 uppercase tracking-[0.3em]">Business Wallet</h2>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                <CreditCoin />
              </div>
              <div>
                <motion.p
                  key={user?.credits ?? 0}
                  initial={{ scale: 1.08, color: '#86efac' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.4 }}
                  className="text-5xl font-black tracking-tighter"
                >
                  {user?.credits || 0}
                </motion.p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Available Credits</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:w-auto">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Earned</p>
              <p className="text-lg font-bold">1,240</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Recharge</p>
              <p className="text-lg font-bold">+500</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-blue-50/20 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-white/60">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FiPlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Credits</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[100, 500, 1000].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-4 rounded-2xl font-black text-sm transition-all ${
                    amount === val
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <label className="absolute left-6 -top-3 bg-white px-2 text-[10px] font-black text-blue-600 tracking-widest uppercase z-10">
                  Custom Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-16 bg-white/40 border border-white/60 rounded-3xl px-8 font-black text-slate-900 text-xl outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner backdrop-blur-sm"
                  placeholder="0.00"
                  min={1}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <FiDollarSign className="w-6 h-6 text-slate-300" />
                </div>
              </div>

              <p className="text-xs text-slate-500 font-semibold">
                You will pay ₹{Number(amount || 0).toLocaleString('en-IN')} via Razorpay and receive {amount || 0} credits.
              </p>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl text-sm font-bold ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}

              <button
                onClick={handleProceedToRecharge}
                disabled={loading || amount <= 0}
                className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black text-sm tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>PROCEED TO RECHARGE <FiArrowUpRight className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <FiCreditCard className="w-3 h-3" /> Secure Razorpay payment gateway
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200">
            <h4 className="text-lg font-black mb-4 tracking-tight">Why use credits?</h4>
            <ul className="space-y-4">
              {[
                'Priority listing in search results',
                'Featured on category banners',
                'Lower order commission fees',
                'Advanced customer analytics'
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold leading-relaxed opacity-90">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <FiCheckCircle className="w-3 h-3" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50/20 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 shadow-xl shadow-blue-900/5">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Activity</h4>
              <FiClock className="text-slate-300" />
            </div>
            <div className="space-y-4">
              {txLoading ? (
                <p className="text-xs text-slate-400 font-bold">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold">No transactions yet.</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-black text-slate-800 truncate">{tx.type_label}</p>
                      <p className="text-[9px] font-bold text-slate-400">{formatTxDate(tx.created_at)}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-500 shrink-0">+{tx.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function FiCheckCircle(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
