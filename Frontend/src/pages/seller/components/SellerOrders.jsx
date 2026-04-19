import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPackage, FiBox, FiRefreshCw, FiXCircle, FiArrowUpRight } from 'react-icons/fi'
import { getOrders } from '../../../services/api'
import { initSocket } from '../../../utils/socket'
import { fixImageUrl } from '../../../utils/image'

function SellerOrders() {
  const { user } = useSelector((state) => state.auth)
  const { orders, ordersLoading: loading } = useSelector((state) => state.seller)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')


  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return ['pending_seller', 'seller_accepted', 'pending', 'accepted'].includes(o.status)
    if (statusFilter === 'delivered') return ['handed_over', 'completed', 'delivered'].includes(o.status)
    if (statusFilter === 'cancelled') return ['cancelled', 'seller_rejected', 'rejected'].includes(o.status)
    return true
  })

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const getStatusStyle = (status) => {
    const s = status || 'pending'
    if (['handed_over', 'completed', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-600'
    if (['cancelled', 'rejected', 'seller_rejected'].includes(s)) return 'bg-rose-50 text-rose-600'
    return 'bg-blue-50 text-blue-600'
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase font-outfit">
             Order <span className="text-blue-600">Pipeline</span>
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-[0.3em] opacity-80">
             Monitoring <span className="text-slate-900 font-black">{filteredOrders.length}</span> active fulfillments
          </p>
        </div>
        
        <div className="relative group max-w-sm w-full">
          <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-all w-5 h-5" />
          <input 
            type="text" 
            placeholder="LOCATE TRANSMISSION..." 
            className="bg-white border-2 border-slate-50 rounded-[2rem] py-5 pl-16 pr-8 text-[11px] font-black tracking-widest text-slate-900 focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none w-full shadow-xl shadow-slate-200/50 transition-all placeholder:text-slate-200"
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
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.75rem] transition-all duration-500 border ${
              statusFilter === f.id 
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
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
                className="seller-card-premium p-8 group relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 ${getStatusStyle(order.status).includes('emerald') ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                       <FiBox className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-none uppercase tracking-tight text-lg">
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
                      <p className="font-black text-slate-900 text-lg tracking-tight">{formatCurrency(order.total_amount)}</p>
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
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all">
                    MANAGE <FiArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SellerOrders

