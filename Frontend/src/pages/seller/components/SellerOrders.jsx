import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiSearch, FiPackage, FiChevronRight, FiCalendar, FiHash, FiMoreHorizontal, FiBox, FiRefreshCw, FiXCircle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders } from '../../../services/api'
import { initSocket } from '../../../utils/socket'

function SellerOrders() {
  const { user, token } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        const orderList = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []
        setOrders(orderList)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) fetchOrders()
  }, [user?.id])

  useEffect(() => {
    if (!token || !user?.id) return
    const socket = initSocket(token)
    socket.on('new_order', (orderData) => {
      if (orderData.seller_id && String(orderData.seller_id) === String(user.id)) {
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === orderData.id)
          if (exists) return prev
          return [orderData, ...prev]
        })
      }
    })
    socket.on('order_updated', (orderData) => {
      if (orderData.seller_id && String(orderData.seller_id) === String(user.id)) {
        setOrders((prev) => prev.map((order) => (order.id === orderData.id ? orderData : order)))
      }
    })
    return () => socket.disconnect()
  }, [token, user])

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(o.status)
    if (statusFilter === 'delivered') return ['handed_over', 'completed', 'delivered'].includes(o.status)
    if (statusFilter === 'cancelled') return ['cancelled', 'seller_rejected', 'rejected'].includes(o.status)
    return true
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
  }

  const formatCurrency = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  const getStatusDisplay = (status) => {
    const s = status || 'pending'
    const isDelivered = ['handed_over', 'completed', 'delivered'].includes(s)
    const isCancelled = ['cancelled', 'rejected', 'seller_rejected'].includes(s)
    const isPending = ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(s)
    
    if (isDelivered) return { label: 'Delivered', styles: 'text-emerald-500 font-black' }
    if (isCancelled) return { label: 'Cancelled', styles: 'text-rose-500 font-black' }
    if (isPending) return { label: 'Processing', styles: 'text-amber-500 font-black' }
    return { label: s.replace('_', ' '), styles: 'text-blue-500 font-black' }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pb-32 pt-4 px-4 sm:px-0"
    >
      {/* Search & Title Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">My Orders</h2>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400"
        >
          <FiSearch className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Compact Filter Grid for Mobile visibility */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { id: 'all', label: 'All Orders', icon: FiBox, color: 'text-blue-400', count: orders.length },
          { id: 'pending', label: 'Processing', icon: FiRefreshCw, color: 'text-amber-400', count: orders.filter(o => ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(o.status)).length },
          { id: 'delivered', label: 'Delivered', icon: FiPackage, color: 'text-emerald-400', count: orders.filter(o => ['handed_over', 'completed', 'delivered'].includes(o.status)).length },
          { id: 'cancelled', label: 'Cancelled', icon: FiXCircle, color: 'text-rose-400', count: orders.filter(o => ['cancelled', 'seller_rejected', 'rejected'].includes(o.status)).length }
        ].map((f) => {
          const isActive = statusFilter === f.id;
          const Icon = f.icon;
          return (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                isActive 
                ? 'bg-[#FF2E63] border-[#FF2E63] shadow-lg shadow-rose-500/20 text-white' 
                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-900 border border-white/5'}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : f.color}`} />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[12px] font-bold tracking-tight truncate">{f.label}</span>
              </div>
              <div className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white text-rose-500' : 'bg-white/10 text-slate-300'}`}>
                {f.count}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Loading Indicator (Non-blocking) */}
      {loading && orders.length > 0 && (
        <div className="absolute top-4 right-6 z-50">
          <div className="w-5 h-5 rounded-full border-2 border-slate-500 border-t-[#FF2E63] animate-spin" />
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-[#FF2E63] animate-spin shadow-[0_0_20px_rgba(255,46,99,0.2)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-24 opacity-30">
              <FiPackage className="w-14 h-14 mx-auto mb-6 text-slate-700" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">No Assets Found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                variants={itemVariants}
                className="bg-[#0f1218]/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-white/5 shadow-2xl relative"
              >
                {/* Header Information */}
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Identifier</p>
                    <h4 className="font-black text-white text-lg tracking-tight">Order No: {order.orderNumber?.split('-').pop()}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Date</p>
                    <span className="text-sm font-bold text-slate-200">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-4 mb-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tracking Number</span>
                    <span className="text-xs font-bold text-[#FF2E63]/90 tracking-wider truncate border-b border-[#FF2E63]/20 pb-1">{order.id || 'GEN-000-XX'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Quantity</span>
                      <span className="text-sm font-bold text-white">{order.quantity} Units</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Valuation</span>
                      <span className="text-sm font-black text-white">{formatCurrency(order.total_amount || (order.quantity * (order.unitPrice || 0)))}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 rounded-2xl bg-slate-900 border border-white/5 text-[11px] font-black uppercase tracking-widest text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Details
                  </motion.button>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusDisplay(order.status).styles.includes('emerald') ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`text-[11px] uppercase underline underline-offset-4 tracking-[0.1em] ${getStatusDisplay(order.status).styles}`}>
                      {getStatusDisplay(order.status).label}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}

export default SellerOrders

