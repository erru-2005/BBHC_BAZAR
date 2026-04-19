/**
 * Seller Dashboard Page Component - Lucid Curator Theme
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FiBox,
  FiClock,
  FiTrendingUp,
  FiBriefcase,
  FiUsers,
  FiArrowUpRight,
  FiMoreHorizontal,
  FiEye,
  FiPackage,
  FiTrash2
} from 'react-icons/fi'
import { FaQrcode } from 'react-icons/fa6'
import { getSocket } from '../../utils/socket'
import { getOrders, getSellerMyProducts, sellerAcceptOrder, sellerRejectOrder } from '../../services/api'
import SellerOrders from './components/SellerOrders'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl } from '../../utils/image'
import { StatCard, SalesPerformanceChart } from './components/DashboardUI'
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

  const recentOrders = orders.slice(0, 5)

  if (showOrders) return <div className="p-8"><SellerOrders /></div>

  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-blue-100 shadow-sm">Merchant Tier 01</span>
            <div className="h-1 w-8 bg-slate-200 rounded-full" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter uppercase font-outfit">
              Strategic <span className="text-blue-600">Commander</span>
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-[0.3em] opacity-80">
              Orchestrating <span className="text-slate-900 font-black">{user?.full_name || 'Protocol Owner'}</span>'s commerce empire
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-black text-slate-800 shadow-sm hover:shadow-md transition-all active:scale-95">
            EXPORT REPORT
          </button>
          <button
            onClick={() => navigate('/seller/products/new')}
            className="bg-blue-600 px-6 py-3 rounded-2xl text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            NEW LISTING
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalSales)}
          icon={FiTrendingUp}
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600', hex: '#10B981' }}
          percentage={14.8}
        />
        <StatCard
          label="Active Orders"
          value={stats.pendingOrders}
          icon={FiBox}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600', hex: '#3B82F6' }}
          percentage={5.2}
        />
        <StatCard
          label="Live Inventory"
          value={stats.totalProducts}
          icon={FiBriefcase}
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600', hex: '#6366F1' }}
          percentage={2}
        />
        <StatCard
          label="Conversion"
          value="4.2%"
          icon={FiUsers}
          color={{ bg: 'bg-rose-50', text: 'text-rose-600', hex: '#F43F5E' }}
          percentage={-0.8}
        />
      </div>

      {/* Charts & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SalesPerformanceChart data={chartData} />

        <div className="seller-card-premium p-8 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Top Sellers</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">By volume</p>
            </div>
            <button className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
              <FiMoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 space-y-7">
            {topProducts.length === 0 ? (
              <div className="text-center py-10">
                <FiBox className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No products yet</p>
              </div>
            ) : (
              topProducts.map((product, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  whileHover={{ x: 5 }}
                  key={product.id}
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl ${product.color.split(' ')[0]} flex items-center justify-center overflow-hidden border border-white/50 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    {product.image ? (
                      <img src={fixImageUrl(product.image)} className="w-full h-full object-cover" />
                    ) : (
                      <FiPackage className="w-6 h-6 opacity-30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.name}</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">{product.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{formatCurrency(product.price)}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <button
            onClick={() => navigate('/seller/products')}
            className="mt-10 py-4 w-full bg-slate-50 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
          >
            INVENTORY MANAGER <FiArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Orders Table */}
      <section className="seller-card-premium p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recent Orders</h3>
            <p className="text-sm text-slate-500 font-medium">Real-time order synchronization active</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400">+12 active now</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-4">Reference</th>
                <th className="px-4">Customer Details</th>
                <th className="px-4">Order Date</th>
                <th className="px-4">Pricing</th>
                <th className="px-4">Fulfillment</th>
                <th className="px-4 text-center">Trace</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const status = order.status || 'pending'
                const isDelivered = ['handed_over', 'completed', 'delivered'].includes(status)
                const isCancelled = ['cancelled', 'rejected', 'seller_rejected'].includes(status)

                let statusStyle = 'bg-blue-50 text-blue-600'
                if (isDelivered) statusStyle = 'bg-emerald-50 text-emerald-600'
                if (isCancelled) statusStyle = 'bg-rose-50 text-rose-600'

                return (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-4 py-4 first:rounded-l-2xl last:rounded-r-2xl bg-white border-y border-l border-slate-50 group-hover:border-blue-100">
                      <span className="text-xs font-black text-blue-600 tracking-widest whitespace-nowrap">
                        ID:{order.orderNumber?.split('-').pop() || order.id.slice(-4).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 overflow-hidden border border-white">
                          {order.user?.image ? (
                            <img src={fixImageUrl(order.user.image)} className="w-full h-full object-cover" />
                          ) : (
                            order.user?.name?.charAt(0) || 'C'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight">{order.user?.name || 'Guest User'}</span>
                          <span className="text-[10px] font-bold text-slate-400">Regular Buyer</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100">
                      <span className="text-xs font-bold text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100">
                      <span className="text-sm font-black text-slate-900 tracking-tight">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-slate-50 group-hover:border-blue-100">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${statusStyle}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 first:rounded-l-2xl last:rounded-r-2xl bg-white border-y border-r border-slate-50 group-hover:border-blue-100 text-center">
                      <button
                        onClick={() => setQrOrder(order)}
                        className="w-10 h-10 rounded-xl border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center mx-auto"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
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
    </div>
  )
}

export default Seller
