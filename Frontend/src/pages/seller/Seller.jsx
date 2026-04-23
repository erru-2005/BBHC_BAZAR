/**
 * Seller Dashboard Page Component - Lucid Curator Theme
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiBox, FiClock, FiTrendingUp, FiBriefcase, FiUsers, FiArrowUpRight, FiMoreHorizontal, FiEye, FiPackage, FiSearch, FiCheckCircle, FiAlertCircle, FiPlus } from 'react-icons/fi'
import { FaQrcode } from 'react-icons/fa6'

import { getSocket } from '../../utils/socket'
import { getOrders, getSellerMyProducts, sellerAcceptOrder, sellerRejectOrder } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import SellerNotifications from './components/SellerNotifications'
import SellerAnalytics from './components/SellerAnalytics'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl } from '../../utils/image'
import { setSellerProducts, setSellerOrders, updateSellerOrder, setSellerLoading } from '../../store/sellerSlice'
import { useOutletContext } from 'react-router-dom'

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

  const [activeView, setActiveView] = useState('dashboard')
  const [ordersError, setOrdersError] = useState(null)
  const [notificationProcessingId, setNotificationProcessingId] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)
  const [newOrderNotification, setNewOrderNotification] = useState(null)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [rejectingOrder, setRejectingOrder] = useState(null)
  const [acceptingOrder, setAcceptingOrder] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionProcessingId, setActionProcessingId] = useState(null)
  
  const { setIsAddingProduct } = useOutletContext()

  // Handle switching views from navigation state
  useEffect(() => {
    if (location.state?.view) {
      setActiveView(location.state.view)
    } else {
      setActiveView('dashboard')
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

  // Stats calculation - synchronized with SellerAnalytics logic
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => !['cancelled', 'rejected', 'seller_rejected'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    
    const activeCount = orders.filter(o => 
      ['pending_seller', 'seller_accepted', 'ready_for_pickup', 'pending', 'accepted'].includes(o.status)
    ).length

    const completedCount = orders.filter(o => 
      ['handed_over', 'completed', 'delivered'].includes(o.status)
    ).length

    return {
      totalProducts: sellerProducts.length,
      totalRevenue: totalRevenue,
      activeOrders: activeCount,
      completedOrders: completedCount,
      totalOrders: orders.length
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
      const response = await sellerAcceptOrder(orderId)
      if (response && response.success) {
        // Redux will be updated via socket
        setAcceptingOrder(null)
        // Show QR for the accepted order immediately if we have the data
        const acceptedOrder = orders.find(o => o.id === orderId)
        if (acceptedOrder) setQrOrder({ ...acceptedOrder, status: 'seller_accepted' })
      }
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

  if (activeView === 'orders') return <div className="p-4 md:p-12 max-w-7xl mx-auto w-full"><SellerOrders /></div>
  if (activeView === 'notifications') return <SellerNotifications />
  if (activeView === 'analytics') return <SellerAnalytics />

  return (
    <div className="p-4 md:p-8 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="relative group overflow-visible">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-[1.1] tracking-tighter font-outfit">
              Welcome Back,<br />
              <span className="inline-block mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 animate-shimmer-text capitalize">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || user?.full_name || 'Merchant')}
              </span>
            </h1>
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
            onClick={() => setIsAddingProduct(true)}
            className="group relative bg-slate-900 px-8 py-4 rounded-2xl text-[11px] font-black text-white shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative flex items-center gap-3 tracking-[0.2em]">
              <FiPlus className="w-4 h-4" strokeWidth={3} />
              NEW LISTING
            </div>
          </button>
        </div>
      </section>

      {/* Quick Stats Grid - Mobile & Desktop Visibility */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-2">
        {[
          { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: FiTrendingUp, color: 'blue' },
          { label: 'Active', value: stats.activeOrders, icon: FiClock, color: 'indigo' },
          { label: 'Completed', value: stats.completedOrders, icon: FiCheckCircle, color: 'emerald' },
          { label: 'Orders', value: stats.totalOrders, icon: FiPackage, color: 'rose' }
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="seller-card-premium p-4 md:p-6 flex flex-col gap-2 md:gap-4 relative overflow-hidden group shadow-md"
          >
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-slate-900 opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-125 transition-all duration-700`} />
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-${item.color}-600 bg-${item.color}-50/50 group-hover:bg-${item.color}-600 group-hover:text-white transition-all duration-300`}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
              <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter truncate">{item.value}</h2>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Recent Orders Table */}
      <section className="seller-card-premium p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Recent Orders</h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold font-outfit uppercase tracking-widest mt-1 opacity-70">Real-time order synchronization active</p>
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
            <p className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-widest">+{orders.length} orders analyzed</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[11px] md:text-xs font-black text-slate-700 uppercase tracking-[0.2em]">
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
                    <td className="px-4 py-4 first:rounded-l-2xl bg-white border-y border-l border-slate-100 group-hover:border-blue-100">
                      <span className="text-xs font-black text-slate-600 tracking-widest pl-2">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-100 group-hover:border-blue-100">
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
                    <td className="px-4 py-4 last:rounded-r-2xl bg-white border-y border-r border-slate-100 group-hover:border-blue-100 text-center">
                       <div className="flex items-center justify-center gap-3">
                         {isPending ? (
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#FFF1F2' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setRejectingOrder(order)}
                                disabled={actionProcessingId === order.id}
                                className="px-4 py-2.5 rounded-xl border border-rose-100 text-rose-500 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                REJECT
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 10px 20px -5px rgba(37,99,235,0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setAcceptingOrder(order)}
                                disabled={actionProcessingId === order.id}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                {actionProcessingId === order.id ? <FiClock className="animate-spin" /> : 'ACCEPT REQUEST'}
                              </motion.button>
                            </div>
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
          onClick={() => setActiveView('orders')}
          className="w-full mt-6 py-5 bg-slate-100 rounded-[1.5rem] text-xs font-black text-slate-700 uppercase tracking-[0.3em] hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-[0.99]"
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

      <AnimatePresence>
        {/* Accept Confirmation Popup */}
        {acceptingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
            onClick={() => setAcceptingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Accept Order?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                By accepting, you commit to fulfilling this request. A handover code will be generated.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  disabled={actionProcessingId === acceptingOrder.id}
                  onClick={() => handleLocalAccept(acceptingOrder.id)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {actionProcessingId === acceptingOrder.id ? <FiClock className="animate-spin" /> : 'YES, ACCEPT'}
                </button>
                <button
                  onClick={() => setAcceptingOrder(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs tracking-[0.2em] hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
              </div>
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
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <FiAlertCircle className="w-8 h-8" />
              </div>
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
                setActiveView('orders')
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
