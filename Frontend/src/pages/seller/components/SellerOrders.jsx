import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPackage, FiBox, FiRefreshCw, FiXCircle, FiArrowUpRight, FiEye } from 'react-icons/fi'
import { getOrders, sellerAcceptOrder, sellerRejectOrder, getServiceAcceptCredit } from '../../../services/api'
import { initSocket } from '../../../utils/socket'
import { fixImageUrl, getOrderProductImage } from '../../../utils/image'
import { updateUserInfo } from '../../../store/authSlice'
import {
  AcceptServiceCreditBadge,
  AcceptServiceCreditDeduction,
  getServiceCategoryFromOrder,
} from './AcceptServiceCreditNotice'

function SellerOrders() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { orders, ordersLoading: loading } = useSelector((state) => state.seller)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'product', 'service'
  const [searchQuery, setSearchQuery] = useState('')
  const [isSynced, setIsSynced] = useState(false)
  const [actionOrder, setActionOrder] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [serviceConfirmOrder, setServiceConfirmOrder] = useState(null)
  const [serviceAcceptCredit, setServiceAcceptCredit] = useState(25)
  const [creditLoading, setCreditLoading] = useState(false)

  useEffect(() => {
    getServiceAcceptCredit().then(setServiceAcceptCredit).catch(() => {})
  }, [])

  useEffect(() => {
    if (!serviceConfirmOrder) return
    const category = getServiceCategoryFromOrder(serviceConfirmOrder)
    setCreditLoading(true)
    getServiceAcceptCredit(true, category)
      .then(setServiceAcceptCredit)
      .catch(() => {})
      .finally(() => setCreditLoading(false))
  }, [serviceConfirmOrder])


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
    // If it's a service, we need confirmation first
    const order = orders.find(o => (o.id === orderId || o._id === orderId))
    const isService = order?.booking || (order?.type === 'service')

    if (isService && !serviceConfirmOrder) {
      setServiceConfirmOrder(order)
      return
    }

    // OPTIMISTIC UPDATE: Instant visual deduction
    if (isService) {
      const category = getServiceCategoryFromOrder(order)
      const deductAmount = category
        ? await getServiceAcceptCredit(true, category).catch(() => serviceAcceptCredit)
        : serviceAcceptCredit
      dispatch(updateUserInfo({ credits: Math.max(0, (user?.credits || 0) - deductAmount) }))
    }

    try {
      setProcessingId(orderId)
      const res = await sellerAcceptOrder(orderId)

      // Sync with final balance from server
      if (res && res.credits !== undefined) {
        dispatch(updateUserInfo({ credits: res.credits }))
      }

      setActionOrder(null)
      setServiceConfirmOrder(null)
    } catch (err) {
      console.error('Accept fail:', err)
      alert('Acceptance failed: ' + err.message)
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

    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'product' && !o.booking) ||
      (typeFilter === 'service' && o.booking)

    return matchesStatus && matchesSearch && matchesType
  })

  const isServiceDatePassed = (order) => {
    if (!order?.booking) return false
    const targetDate = order.booking.endDate || order.booking.startDate
    if (!targetDate) return false
    const parts = targetDate.split('-')
    if (parts.length !== 3) return false
    const [year, month, day] = parts.map(Number)
    const bookingDate = new Date(year, month - 1, day)
    bookingDate.setHours(23, 59, 59, 999)
    return new Date() > bookingDate
  }

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const getStatusStyle = (status, order) => {
    const s = status || 'pending'
    if (['handed_over', 'completed', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-600 border-emerald-100'

    // Check if service should appear as completed
    if (order?.booking && isServiceDatePassed(order) && (s === 'seller_accepted' || s === 'accepted')) {
      return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }

    if (['cancelled', 'rejected', 'seller_rejected'].includes(s)) return 'bg-rose-50 text-rose-600 border-rose-100'
    return 'bg-blue-50 text-blue-600 border-blue-100'
  }

  return (
    <div className="flex flex-col gap-10 px-2 md:px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 pt-4 pb-4 px-3 md:px-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none uppercase">
              Order <span className="text-blue-600">Pipeline</span>
            </h2>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all border ${isSynced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
              {isSynced ? 'Live Sync' : 'Disconnected'}
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 tracking-normal opacity-80">
            Monitoring <span className="text-slate-900 font-bold">{filteredOrders.length}</span> active fulfillments
          </p>
        </div>

        <div className="relative group flex-1 max-w-2xl transition-all">
          <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="bg-blue-50/30 backdrop-blur-md border border-white/60 rounded-[2rem] py-4 pl-14 pr-8 text-sm font-semibold tracking-normal text-slate-900 focus:bg-white focus:border-blue-600 outline-none w-full shadow-lg shadow-blue-900/5 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Type Slider & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Product/Service Slider */}
        <div className="flex bg-blue-50/40 p-1.5 rounded-2xl border border-white/60 backdrop-blur-md w-full md:w-auto shadow-sm">
          {[
            { id: 'all', label: 'All' },
            { id: 'product', label: 'Products' },
            { id: 'service', label: 'Services' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === t.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-1.5 bg-blue-50/30 backdrop-blur-md rounded-[2rem] border border-white/60 flex-1 shadow-sm">
          {[
            { id: 'all', label: 'All Status', icon: FiBox },
            { id: 'pending', label: 'Pending', icon: FiRefreshCw },
            { id: 'delivered', label: 'Completed', icon: FiPackage },
            { id: 'cancelled', label: 'Cancelled', icon: FiXCircle }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[1.5rem] transition-all duration-300 border ${statusFilter === f.id
                ? 'bg-white text-blue-600 shadow-md border-white'
                : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
            >
              <f.icon className="w-4 h-4" />
              <span className="font-bold text-[10px] tracking-tight">{f.label}</span>
            </button>
          ))}
        </div>
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
            filteredOrders.map((order) => {
              const productImg = getOrderProductImage(order)
              return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 group relative overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_15px_40px_-20px_rgba(0,0,0,0.08)]"
              >
                {/* Decorative glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 ${getStatusStyle(order.status).includes('emerald') ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                      <FiBox className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-none tracking-tight text-base">
                        {order.orderNumber ? `Order Ref: ${order.orderNumber.split('-').pop()}` : (order.id || order._id) ? `Ref: ${(order.id || order._id).toString().slice(-6).toUpperCase()}` : 'Order Token'}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mt-2 tracking-normal flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Recorded {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Processing'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm border ${getStatusStyle(order.status, order)}`}>
                    {order.booking && (order.status === 'seller_accepted' || order.status === 'accepted')
                      ? (isServiceDatePassed(order) ? 'Completed' : 'Accepted')
                      : (order.status ? order.status.replace(/_/g, ' ') : 'Pending')}
                  </span>
                </div>

                <div className="flex items-center gap-5 mb-8 p-5 bg-slate-50/50 backdrop-blur-sm rounded-[2rem] border border-white/80 shadow-inner group-hover:bg-slate-50 transition-colors">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                    {productImg ? (
                      <img src={productImg} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><FiPackage className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-slate-800 truncate tracking-tight">{order.product?.product_name || order.product?.name || 'Asset Item'}</h5>
                    <p className="text-xs text-slate-500 font-semibold mt-1 opacity-80">
                      {order.booking ? (
                        <span className="text-blue-600">
                          {order.booking.type === 'single'
                            ? `Scheduled: ${new Date(order.booking.startDate).toLocaleDateString()}`
                            : `Range: ${new Date(order.booking.startDate).toLocaleDateString()} - ${new Date(order.booking.endDate).toLocaleDateString()}`
                          }
                        </span>
                      ) : (
                        `${order.quantity} Unit(s) × ${formatCurrency(order.unitPrice || (order.total_amount / order.quantity))}`
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valuation</p>
                    <p className="font-bold text-slate-900 text-base tracking-tight">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>

                {(order.status === 'seller_rejected' || order.status === 'rejected' || order.status === 'cancelled') && (
                  <div className="mx-2 mb-6 p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Termination Logic</p>
                      <p className="text-xs text-rose-600/80 font-bold leading-relaxed">
                        {order.rejectionReason || order.rejection_reason || 'Manual termination initiated.'}
                      </p>
                    </div>
                  </div>
                )}

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
                      <span className="text-xs font-bold text-slate-700 tracking-tight">{order.user?.name || 'Client'}</span>
                      <span className="text-[10px] font-semibold text-slate-400">Verified User</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === 'pending_seller' ? (
                      <>
                        <button
                          disabled={processingId === order.id}
                          onClick={() => {
                            setRejectionReason('Service/Product not available at the moment') // Default or open modal
                            setActionOrder(order)
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-[10px] font-black text-slate-400 hover:text-rose-600 hover:bg-rose-50 uppercase tracking-widest transition-all"
                        >
                          REJECT
                        </button>
                        <button
                          disabled={processingId === order.id}
                          onClick={() => handleAccept(order.id)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-blue-600/10 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                          {processingId === order.id ? <FiRefreshCw className="animate-spin w-3 h-3" /> : 'ACCEPT'}
                        </button>
                      </>
                    ) : (
                      <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-xs font-bold text-white tracking-normal shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all">
                        Details <FiEye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )})
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
              className="bg-white rounded-[2rem] p-8 w-full shadow-2xl relative border border-slate-50 text-center"
              style={{ width: 'clamp(280px, 90%, 350px)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Order Decision</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Ref: {actionOrder.orderNumber?.split('-').pop() || actionOrder.id}</p>

              <div className="space-y-6">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (if any)..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition-all min-h-[100px] resize-none"
                />

                <div className="flex flex-col gap-3">
                  <motion.button
                    disabled={processingId === actionOrder.id}
                    onClick={() => handleAccept(actionOrder.id)}
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {processingId === actionOrder.id ? <FiRefreshCw className="animate-spin" /> : 'ACCEPT ORDER'}
                  </motion.button>
                  <button
                    disabled={processingId === actionOrder.id || !rejectionReason.trim()}
                    onClick={() => handleReject(actionOrder.id)}
                    className="w-full py-2 text-slate-400 hover:text-rose-500 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-30"
                  >
                    {processingId === actionOrder.id ? '...' : 'REJECT ORDER'}
                  </button>
                  <button
                    onClick={() => setActionOrder(null)}
                    className="w-full py-1 text-slate-300 hover:text-slate-500 text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serviceConfirmOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setServiceConfirmOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-10 w-full text-center shadow-2xl border border-slate-50 relative"
              style={{ width: 'clamp(320px, 90%, 420px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiRefreshCw className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">Accept Service?</h3>
              <div className="flex items-center justify-center gap-2 mb-6">
                <AcceptServiceCreditBadge balance={user?.credits || 0} />
              </div>
              <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed px-2">
                Confirm your availability to fulfill this service request.
                <AcceptServiceCreditDeduction amount={serviceAcceptCredit} loading={creditLoading} />
              </p>

              {user?.credits < serviceAcceptCredit && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-[10px] uppercase tracking-widest">
                    <FiXCircle className="w-4 h-4" /> Insufficient Credits
                  </div>
                  <p className="text-[10px] text-rose-500 font-medium">You need at least {serviceAcceptCredit} credits to accept this service. Please recharge your wallet.</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={user?.credits >= serviceAcceptCredit ? { scale: 1.02 } : {}}
                  whileTap={user?.credits >= serviceAcceptCredit ? { scale: 0.98 } : {}}
                  disabled={processingId === serviceConfirmOrder.id || creditLoading || user?.credits < serviceAcceptCredit}
                  onClick={() => handleAccept(serviceConfirmOrder.id)}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${user?.credits >= serviceAcceptCredit
                      ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale'
                    }`}
                >
                  {processingId === serviceConfirmOrder.id ? <FiRefreshCw className="animate-spin w-4 h-4" /> : 'CONFIRM & ACCEPT'}
                </motion.button>
                <button
                  onClick={() => setServiceConfirmOrder(null)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SellerOrders

