/**
 * Seller Dashboard Page Component - Lucid Curator Theme
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiBox, FiClock, FiTrendingUp, FiBriefcase, FiUsers, FiArrowUpRight, FiMoreHorizontal, FiEye, FiPackage, FiSearch } from 'react-icons/fi'
import { FaQrcode } from 'react-icons/fa6'

import { getSocket } from '../../utils/socket'
import { getOrders, getSellerMyProducts, sellerAcceptOrder, sellerRejectOrder } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl } from '../../utils/image'
import { setSellerProducts, setSellerOrders, updateSellerOrder, setSellerLoading } from '../../store/sellerSlice'

function Seller() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useSelector((state) => state.auth)
  const {
    orders,
    products: sellerProducts,
    ordersLoading,
    productsLoading
  } = useSelector((state) => state.seller)

  const [showOrders, setShowOrders] = useState(false)
  const [ordersError, setOrdersError] = useState(null)
  const [notificationProcessingId, setNotificationProcessingId] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)
  const [newOrderNotification, setNewOrderNotification] = useState(null)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [rejectingOrder, setRejectingOrder] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionProcessingId, setActionProcessingId] = useState(null)

  // Handle switching views from navigation state
  useEffect(() => {
    if (location.state?.view === 'orders') {
      setShowOrders(true)
    } else if (location.state?.view === 'dashboard') {
      setShowOrders(false)
    }
  }, [location.state])

  // Global socket listener initialization
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user?.id) return

    const handleNewOrder = (orderData) => {
      if (String(orderData?.seller_id) === String(user.id)) {
        dispatch(updateSellerOrder(orderData))
        // Trigger real-time notification popup
        setNewOrderNotification(orderData)
        // Clear after 10 seconds
        setTimeout(() => setNewOrderNotification(null), 10000)
      }
    }

    const handleOrderUpdated = (orderData) => {
      if (String(orderData?.seller_id) === String(user.id)) {
        dispatch(updateSellerOrder(orderData))
      }
    }

    socket.on('new_order', handleNewOrder)
    socket.on('order_updated', handleOrderUpdated)

    return () => {
      socket.off('new_order', handleNewOrder)
      socket.off('order_updated', handleOrderUpdated)
    }
  }, [user?.id, dispatch])

  // Load orders and products if missing
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      // Only fetch if data is missing
      if (orders.length === 0 || sellerProducts.length === 0) {
        try {
          dispatch(setSellerLoading({ field: 'orders', loading: true }))
          const [ordersData, productsData] = await Promise.all([
            getOrders(),
            getSellerMyProducts()
          ])
          const fetchedOrders = Array.isArray(ordersData?.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : [])
          dispatch(setSellerOrders(fetchedOrders))
          dispatch(setSellerProducts(productsData || []))
        } catch (error) {
          setOrdersError(error.message)
        } finally {
          dispatch(setSellerLoading({ field: 'orders', loading: false }))
        }
      }
    }
    loadData()
  }, [user, orders.length, sellerProducts.length, dispatch])

  // Stats calculation
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    const pendingCount = orders.filter(o => !['handed_over', 'completed', 'delivered', 'cancelled', 'rejected'].includes(o.status)).length

    return {
      totalProducts: sellerProducts.length,
      totalSales: totalSales,
      pendingOrders: pendingCount,
      revenue30Days: totalSales * 0.4 // Mocked for visuals
    }
  }, [orders, sellerProducts])

  const chartData = [
    { name: 'WEEK 1', sales: 4200 },
    { name: 'WEEK 2', sales: 3800 },
    { name: 'WEEK 3', sales: 5400 },
    { name: 'WEEK 4', sales: 4900 },
  ]

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const topProductsColors = [
    'bg-blue-50 text-blue-600',
    'bg-purple-50 text-purple-600',
    'bg-emerald-50 text-emerald-600',
    'bg-rose-50 text-rose-600'
  ]

  const topProducts = sellerProducts.slice(0, 4).map((p, idx) => ({
    id: p.id || p._id,
    name: p.product_name || p.name,
    sales: 10 + Math.floor(Math.random() * 50),
    price: p.selling_price || p.price,
    image: p.thumbnail || p.image,
    color: topProductsColors[idx % 4]
  }))

  const recentOrders = useMemo(() => {
    // Only show pending or in-progress orders on the dashboard
    // Filter out completed, cancelled and delivered
    const activeStates = ['pending_seller', 'seller_accepted', 'ready_for_pickup', 'pending', 'accepted']
    let filtered = orders.filter(o =>
      activeStates.includes(o.status || 'pending_seller')
    )

    if (dashboardSearch) {
      const s = dashboardSearch.toLowerCase()
      filtered = filtered.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(s) ||
        (o.user?.name || '').toLowerCase().includes(s) ||
        (o.product?.name || o.product_snapshot?.name || '').toLowerCase().includes(s)
      )
    }

    return filtered.slice(0, 10)
  }, [orders, dashboardSearch])

  const handleLocalAccept = async (orderId) => {
    try {
      setActionProcessingId(orderId)
      await sellerAcceptOrder(orderId)
      // Redux will be updated via socket, but we can also trigger a refresh if needed
      // However the socket handleOrderUpdated should handle it
    } catch (err) {
      alert('Acceptance failed: ' + err.message)
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleLocalReject = async () => {
    if (!rejectingOrder || !rejectionReason.trim()) return
    try {
      setActionProcessingId(rejectingOrder.id)
      await sellerRejectOrder(rejectingOrder.id, rejectionReason)
      setRejectingOrder(null)
      setRejectionReason('')
    } catch (err) {
      alert('Rejection failed: ' + err.message)
    } finally {
      setActionProcessingId(null)
    }
  }

  if (showOrders) return <div className="p-4 md:p-12 max-w-7xl mx-auto w-full"><SellerOrders /></div>

  return (
    <div className="p-4 md:p-12 flex flex-col gap-10 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4">
            <span className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full text-xs md:text-sm font-black uppercase tracking-[0.3em] border border-blue-100 shadow-sm">Merchant Tier 01</span>
            <div className="h-[2px] w-16 bg-gradient-to-r from-blue-600 to-transparent rounded-full" />
          </div>
          <div className="relative group overflow-visible">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tighter uppercase font-outfit">
              Welcome Back,<br />
              <span className="inline-block mt-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 animate-shimmer-text">
                {user?.full_name || 'BAZAR001'}
              </span>
            </h1>
            <p className="text-xs md:text-sm font-black text-slate-400 mt-8 uppercase tracking-[0.4em] opacity-80 flex items-center gap-4">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse" />
              Current Protocol Status: <span className="text-slate-900 font-bold">EXCELLENCE OPERATIONAL</span>
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative group min-w-[280px]">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              placeholder="SEARCH ACTIVE ORDERS..."
              className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-xs font-black tracking-widest text-slate-900 focus:border-blue-600 outline-none shadow-sm transition-all"
            />
          </div>
          <button
            onClick={() => navigate('/seller/products/new')}
            className="bg-blue-600 px-6 py-3 rounded-2xl text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
          >
            NEW LISTING
          </button>
        </div>
      </section>


      {/* Recent Orders Table */}
      <section className="seller-card-premium p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Recent Orders</h3>
            <p className="text-sm md:text-base text-slate-500 font-medium font-serif italic">Real-time order synchronization active</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3 transition-all hover:space-x-1">
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="w-12 h-12 rounded-full border-4 border-white bg-slate-50 overflow-hidden shadow-md">
                  {order.user?.image ? (
                    <img src={fixImageUrl(order.user.image)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-black uppercase">
                      {order.user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs md:text-sm font-bold text-slate-400">+{orders.length} orders analyzed</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4 text-center">Quantity</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, index) => {
                const status = order.status || 'pending_seller'
                const isAccepted = status === 'seller_accepted'
                const isPending = status === 'pending_seller'
                const productName = order.product_snapshot?.name || order.product?.name || 'PRODUCT NOT FOUND'
                const productImg = order.product_snapshot?.thumbnail || order.product?.thumbnail

                return (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-4 py-4 first:rounded-l-2xl bg-white border-y border-l border-slate-50 group-hover:border-blue-100">
                      <span className="text-xs font-black text-slate-400 tracking-widest pl-2">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm shrink-0">
                          {productImg ? (
                            <img src={fixImageUrl(productImg)} className="w-full h-full object-cover" />
                          ) : (
                            <FiPackage className="w-6 h-6 opacity-20" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{productName}</span>
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">REF: {order.orderNumber?.split('-').pop()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-sm font-black text-slate-900">{order.quantity || 1}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UNITS</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 last:rounded-r-2xl bg-white border-y border-r border-slate-50 group-hover:border-blue-100 text-center">
                       <div className="flex items-center justify-center gap-3">
                         {isPending ? (
                           <>
                             <button
                               onClick={() => setRejectingOrder(order)}
                               disabled={actionProcessingId === order.id}
                               className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                             >
                               REJECT
                             </button>
                             <button
                               onClick={() => handleLocalAccept(order.id)}
                               disabled={actionProcessingId === order.id}
                               className="px-5 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                             >
                               {actionProcessingId === order.id ? <FiClock className="animate-spin" /> : 'ACCEPT'}
                             </button>
                           </>
                         ) : (
                           <button
                             onClick={() => setQrOrder(order)}
                             className="px-6 py-2.5 rounded-xl bg-slate-900 text-white shadow-xl hover:bg-blue-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                           >
                             <FaQrcode className="w-3.5 h-3.5" /> Handover Code
                           </button>
                         )}
                       </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setShowOrders(true)}
          className="w-full mt-6 py-5 bg-slate-50 rounded-[1.5rem] text-xs font-black text-slate-600 uppercase tracking-[0.3em] hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-[0.99]"
        >
          EXPLORE ALL TRANSACTIONS
        </button>
      </section>

      {/* QR Modal integration */}
      <AnimatePresence>
        {qrOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
            onClick={() => setQrOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Secure Handover</h3>
              <p className="text-sm text-slate-500 font-medium mb-10">Scan this code to finalize fulfillment.</p>

              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 inline-block mb-10 shadow-inner">
                <QRCode value={qrOrder.secureTokenSeller || qrOrder.id} size={180} />
              </div>

              <button
                onClick={() => setQrOrder(null)}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs tracking-[0.3em] shadow-xl active:scale-95 transition-transform"
              >
                DISMISS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Order Alert Popup */}
      <AnimatePresence>
        {rejectingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setRejectingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Reject Request?</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Ref: {rejectingOrder.orderNumber || rejectingOrder.id}</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Reason for rejection</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectingOrder(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs tracking-[0.2em] hover:bg-slate-200 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    disabled={actionProcessingId === rejectingOrder.id || !rejectionReason.trim()}
                    onClick={handleLocalReject}
                    className="flex-[1.5] py-4 bg-rose-600 text-white rounded-2xl font-black text-xs tracking-[0.2em] shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    {actionProcessingId === rejectingOrder.id ? <FiClock className="animate-spin" /> : 'CONFIRM REJECT'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newOrderNotification && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.8, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 flex items-center gap-5 cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => {
                setNewOrderNotification(null)
                setShowOrders(true)
              }}
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white shadow-lg animate-bounce-slow">
                <FiPackage size={30} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Incoming Transmission</h4>
                </div>
                <p className="font-bold text-sm leading-tight text-slate-100">NEW ORDER FOR YOU!</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Ref: {newOrderNotification.orderNumber?.split('-').pop() || '000X'}</p>
              </div>
              <button className="text-white/40 hover:text-white" onClick={(e) => { e.stopPropagation(); setNewOrderNotification(null); }}>×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Seller
