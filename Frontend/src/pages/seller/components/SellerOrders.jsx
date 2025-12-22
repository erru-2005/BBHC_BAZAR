import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders } from '../../../services/api'
import { initSocket } from '../../../utils/socket'

function SellerOrders() {
  const { user, token } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // all | accepted | completed | cancelled | rejected

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        const orderList = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? data
            : []
        // Filter orders for this seller
        const sellerOrders = orderList.filter((order) =>
          order.seller_id && String(order.seller_id) === String(user?.id)
        )
        setOrders(sellerOrders)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) {
      fetchOrders()
    }
  }, [user])

  // Real-time Socket.IO updates for history view
  useEffect(() => {
    if (!token || !user?.id) return

    const socket = initSocket(token)

    socket.on('connect', () => {
      socket.emit('user_authenticated', {
        user_id: user.id,
        user_type: 'seller'
      })
    })

    socket.on('new_order', (orderData) => {
      // Only add if it's for this seller
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
        setOrders((prev) =>
          prev.map((order) => (order.id === orderData.id ? orderData : order))
        )
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user])

  // History-only view: accepted / completed / delivered / cancelled / rejected
  const acceptedOrders = orders.filter((o) => o.status === 'seller_accepted')
  const completedOrders = orders.filter((o) =>
    ['handed_over', 'completed', 'delivered'].includes(o.status)
  )
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')
  const rejectedOrders = orders.filter((o) =>
    ['seller_rejected', 'rejected'].includes(o.status)
  )

  const showAccepted = statusFilter === 'all' || statusFilter === 'accepted'
  const showCompleted = statusFilter === 'all' || statusFilter === 'completed'
  const showCancelled = statusFilter === 'all' || statusFilter === 'cancelled'
  const showRejected = statusFilter === 'all' || statusFilter === 'rejected'

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'accepted', label: 'Active' },
    { id: 'completed', label: 'Done' },
    { id: 'cancelled', label: 'Void' }
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pt-2"
    >
      <div className="flex flex-col gap-6">
        {/* Header & Stats Container */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Custom Pill Filter */}
          <div className="relative flex items-center rounded-2xl bg-white/5 p-1 border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <AnimatePresence>
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`relative z-10 px-6 py-2 text-xs font-black tracking-tight transition-colors whitespace-nowrap flex-1 sm:flex-none ${statusFilter === f.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {statusFilter === f.id && (
                    <motion.div
                      layoutId="order-filter-glow"
                      className="absolute inset-0 rounded-xl bg-white/10 border border-white/10 shadow-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {f.label}
                </button>
              ))}
            </AnimatePresence>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                { count: acceptedOrders.length, color: 'bg-emerald-500' },
                { count: completedOrders.length, color: 'bg-blue-500' },
                { count: cancelledOrders.length + rejectedOrders.length, color: 'bg-rose-500' }
              ].map((s, i) => (
                <div key={i} className={`flex items-center justify-center h-8 px-3 rounded-full border-2 border-[#0f172a] ${s.color} text-[10px] font-black text-white shadow-xl`}>
                  {s.count}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
          </div>
        </div>
      </div>

      {error && (
        <motion.div variants={itemVariants} className="spatial-card border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
          <div className="w-10 h-10 rounded-full border-2 border-t-rose-500 animate-spin mb-4" />
          <p className="text-sm font-bold tracking-widest uppercase">Syncing Orders</p>
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          {/* Order Group Component */}
          <AnimatePresence mode="popLayout">
            {[
              { show: showAccepted, list: acceptedOrders, title: 'Active / Accepted', icon: FaCheck, color: 'emerald' },
              { show: showCompleted, list: completedOrders, title: 'Successful History', icon: FaCheck, color: 'blue' },
              { show: showCancelled, list: cancelledOrders, title: 'Cancelled by Buyer', icon: FaXmark, color: 'yellow' },
              { show: showRejected, list: rejectedOrders, title: 'Rejected by You', icon: FaXmark, color: 'rose' }
            ].map((group) => group.show && group.list.length > 0 && (
              <motion.div
                key={group.title}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 px-2">
                  <div className={`p-2 rounded-lg bg-${group.color}-500/10 text-${group.color}-400 border border-${group.color}-500/20`}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-100/60 uppercase tracking-[0.2em]">{group.title}</h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {group.list.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      variants={itemVariants}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="spatial-card p-5 group cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
                            {order.product?.image ? (
                              <img src={order.product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            ) : (
                              <div className="text-slate-700 font-bold">#</div>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#fb7185] group-hover:active-glow transition-all">
                              #{order.orderNumber}
                            </p>
                            <h4 className="text-base font-bold text-white mt-0.5 group-hover:text-rose-400 transition-colors">
                              {order.product?.name || 'Product'}
                            </h4>
                            <p className="text-xs font-bold text-slate-300 mt-1">
                              {order.quantity} × {Number(order.unitPrice || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${group.color}-500/10 text-${group.color}-400 border-${group.color}-500/20 shadow-[0_0_10px_rgba(0,0,0,0.3)]`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 italic">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && orders.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="spatial-card py-20 flex flex-col items-center gap-4 opacity-40 grayscale"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                <group.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold tracking-widest uppercase">Pristine Dashboard</p>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default SellerOrders

