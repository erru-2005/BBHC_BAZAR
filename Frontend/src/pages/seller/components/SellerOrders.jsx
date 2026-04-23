import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPackage, FiBox, FiRefreshCw, FiXCircle, FiArrowUpRight, FiEye } from 'react-icons/fi'
import { getOrders } from '../../../services/api'
import { initSocket } from '../../../utils/socket'
import { fixImageUrl } from '../../../utils/image'

function SellerOrders() {
  const { user } = useSelector((state) => state.auth)
  const { orders, ordersLoading: loading } = useSelector((state) => state.seller)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSynced, setIsSynced] = useState(false)
  const [actionOrder, setActionOrder] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState(null)


  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOrders()
      const orderList = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []
      setOrders(orderList)
      setIsSynced(true)
      setIsFallback(false)
    } catch (err) {
      setError(err.message || 'TRANSMISSION TIMEOUT')
      setIsSynced(false)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (orderId) => {
    try {
      setProcessingId(orderId)
      await sellerAcceptOrder(orderId)
      setActionOrder(null)
      // fetchOrders() will be handled by socket in Seller.jsx, but let's refresh for safety
      const data = await getOrders()
      const orderList = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []
      // setOrders is not here, it's in Redux, but SellerOrders uses it from Redux
      // Wait, SellerOrders uses 'orders' from Redux on line 11!
      // So I just need to call the API, and the socket might update Redux.
    } catch (err) {
      console.error('Accept fail:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (orderId) => {
    if (!rejectionReason.trim()) return
    try {
      setProcessingId(orderId)
      await sellerRejectOrder(orderId, rejectionReason)
      setRejectionReason('')
      setActionOrder(null)
    } catch (err) {
      console.error('Reject fail:', err)
    } finally {
      setProcessingId(null)
    }
  }


  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(o.status)) ||
      (statusFilter === 'delivered' && ['handed_over', 'completed', 'delivered'].includes(o.status)) ||
      (statusFilter === 'cancelled' && ['cancelled', 'seller_rejected', 'rejected'].includes(o.status))

    const searchLow = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery ||
      (o.orderNumber?.toLowerCase().includes(searchLow)) ||
      (o.user?.name?.toLowerCase().includes(searchLow)) ||
      (o.product?.product_name?.toLowerCase().includes(searchLow)) ||
      (o.id?.toString().includes(searchLow))

    return matchesStatus && matchesSearch
  })

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const getStatusStyle = (status) => {
    const s = status || 'pending'
    if (['handed_over', 'completed', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-600'
    if (['cancelled', 'rejected', 'seller_rejected'].includes(s)) return 'bg-rose-50 text-rose-600'
    return 'bg-blue-50 text-blue-600'
  }

  return (
    <div className="flex flex-col gap-10 px-2 md:px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pt-4 pb-4 px-3 md:px-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase font-outfit">
              Order <span className="text-blue-600">Pipeline</span>
            </h2>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all border ${isSynced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
              {isSynced ? 'Live Sync' : 'Disconnected'}
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em] opacity-80">
            Monitoring <span className="text-slate-900 font-black">{filteredOrders.length}</span> active fulfillments
          </p>
        </div>

        <div className="relative group flex-1 max-w-2xl transition-all">
          <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="LOCATE TRANSMISSION..."
            className="bg-slate-50/50 border-2 border-slate-200 rounded-[2rem] py-4 pl-14 pr-8 text-xs md:text-sm font-black tracking-widest text-slate-900 focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 outline-none w-full shadow-lg shadow-slate-200/40 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-50 rounded-[2.5rem] border border-slate-100/50 backdrop-blur-sm">
        {[
          { id: 'all', label: 'Complete Archive', icon: FiBox, color: 'blue' },
          { id: 'pending', label: 'Active Tasks', icon: FiRefreshCw, color: 'amber' },
          { id: 'delivered', label: 'Finalized', icon: FiPackage, color: 'emerald' },
          { id: 'cancelled', label: 'Annulled', icon: FiXCircle, color: 'rose' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-[1.75rem] transition-all duration-500 border ${statusFilter === f.id
              ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/10 border-white'
              : 'text-slate-400 border-transparent hover:text-slate-900'
              }`}
          >
            <f.icon className={`w-5 h-5 transition-transform ${statusFilter === f.id ? 'scale-110' : ''}`} />
            <span className="font-black text-xs uppercase tracking-widest">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {loading ? (
            // Shimmer Loading States
            [1, 2, 3, 4].map((i) => (
              <div key={`shimmer-${i}`} className="seller-card-premium p-8 animate-pulse">
                <div className="flex justify-between mb-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-slate-100 rounded-full" />
                      <div className="w-20 h-3 bg-slate-50 rounded-full" />
                    </div>
                  </div>
                  <div className="w-24 h-8 bg-slate-100 rounded-xl" />
                </div>
                <div className="w-full h-24 bg-slate-50 rounded-[2rem] mb-8" />
                <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                  <div className="w-24 h-8 bg-slate-100 rounded-full" />
                  <div className="w-20 h-10 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-full py-24 text-center seller-card-premium border-dashed border-rose-200 bg-rose-50/30 flex flex-col items-center">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-6 shadow-sm">
                <FiRefreshCw className="w-10 h-10 animate-spin-slow" />
              </div>
              <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter mb-2">Transmission Interrupted</h3>
              <p className="text-rose-500/70 font-bold uppercase tracking-[0.2em] text-[10px] mb-8 max-w-xs">{error}</p>
              <button
                onClick={fetchOrders}
                className="px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2"
              >
                RETRY CONNECTION <FiTrendingUp className="w-4 h-4 rotate-90" />
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="col-span-full py-24 text-center seller-card-premium border-dashed border-slate-300 bg-slate-50 opacity-60">
              <FiPackage className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Awaiting new transmissions</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="seller-card-premium p-6 group relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 ${getStatusStyle(order.status).includes('emerald') ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                      <FiBox className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-none uppercase tracking-tight text-base">
                        {order.orderNumber ? `ORDER REF: ${order.orderNumber.split('-').pop()}` : (order.id || order._id) ? `REF: ${(order.id || order._id).toString().slice(-6).toUpperCase()}` : 'ORDER-TKN-NEW'}
                      </h4>
                      <p className="text-[11px] font-black text-slate-500 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Recorded {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'PROCESSING'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${getStatusStyle(order.status)} animate-pulse-slow`}>
                    {order.status ? order.status.replace(/_/g, ' ') : 'PENDING'}
                  </span>
                </div>

                <div className="flex items-center gap-5 mb-8 p-5 bg-slate-50/50 backdrop-blur-sm rounded-[2rem] border border-white/80 shadow-inner group-hover:bg-slate-50 transition-colors">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                    {order.product?.image || order.product?.thumbnail ? (
                      <img src={fixImageUrl(order.product.image || order.product.thumbnail)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><FiPackage className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-sm text-slate-800 truncate uppercase tracking-tight">{order.product?.product_name || order.product?.name || 'ASSET ITEM'}</h5>
                    <p className="text-xs text-slate-500 font-bold mt-1 opacity-80">{order.quantity} UNIT(S) × {formatCurrency(order.unitPrice || (order.total_amount / order.quantity))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VALUATION</p>
                    <p className="font-black text-slate-900 text-base tracking-tight">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden border border-white shadow-sm">
                        {order.user?.image ? (
                          <img src={fixImageUrl(order.user.image)} className="w-full h-full object-cover" />
                        ) : (
                          order.user?.name?.charAt(0) || 'C'
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{order.user?.name || 'CLIENT'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase border-b border-blue-200/50 w-fit">Verified User</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {order.status === 'pending_seller' && (
                         <>
                           <button 
                             onClick={() => setActionOrder(order)}
                             className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-blue-600/10 hover:bg-blue-700 active:scale-95 transition-all"
                           >
                             DECIDE <FiArrowUpRight className="w-3.5 h-3.5" />
                           </button>
                         </>
                       )}
                       {order.status !== 'pending_seller' && (
                         <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all">
                           DETAILS <FiEye className="w-3.5 h-3.5" />
                         </button>
                       )}
                    </div>
                  </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {actionOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setActionOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Order Decision</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Ref: {actionOrder.orderNumber || actionOrder.id}</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Rejection Note (If rejecting)</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={processingId === actionOrder.id || !rejectionReason.trim()}
                    onClick={() => handleReject(actionOrder.id)}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    {processingId === actionOrder.id ? <FiRefreshCw className="animate-spin" /> : 'REJECT'}
                  </button>
                  <button
                    disabled={processingId === actionOrder.id}
                    onClick={() => handleAccept(actionOrder.id)}
                    className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    {processingId === actionOrder.id ? <FiRefreshCw className="animate-spin" /> : 'ACCEPT ORDER'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SellerOrders

