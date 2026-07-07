import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
  FaArrowLeft,
  FaBox,
  FaClock,
  FaHandshake,
  FaChevronRight,
  FaCalendarDays
} from 'react-icons/fa6'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrders } from '../../services/api'
import {
  STATUS_STYLES,
  formatOrderDate,
  getBookingSummary,
  getOrderProductImage,
  getOrderProductName,
  getOrderTotal,
  isActiveOrder,
  isHistoryOrder,
  isOrderService
} from './utils/orderHelpers'

const calculateArrivalDate = (createdAt, deliverySpan) => {
  if (!createdAt) return ''
  const span = Number(deliverySpan ?? 2)
  if (isNaN(span) || span < 1) return ''

  let daysToAdd = span - 1
  let currentDate = new Date(createdAt)

  // If today is Sunday, move to Monday (Sunday is not counted)
  while (currentDate.getDay() === 0) {
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Add days, skipping Sundays
  while (daysToAdd > 0) {
    currentDate.setDate(currentDate.getDate() + 1)
    if (currentDate.getDay() !== 0) {
      daysToAdd--
    }
  }

  const dd = String(currentDate.getDate()).padStart(2, '0')
  const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
  const yyyy = currentDate.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function UserOrderHistory() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('product')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const data = await getOrders({ page: 1, limit: 100, sort: '-created_at' }, { forceRefresh: true })
        const ordersArray = Array.isArray(data) ? data : (data.orders || [])
        setOrders(ordersArray)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const sortByRecent = (list) =>
    [...list].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)
      const dateB = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0)
      return dateB - dateA
    })

  const { recentOrders, pastOrders } = useMemo(() => {
    const typeFiltered = orders.filter((order) => {
      const isService = isOrderService(order)
      return typeFilter === 'product' ? !isService : isService
    })

    return {
      recentOrders: sortByRecent(typeFiltered.filter(isActiveOrder)),
      pastOrders: sortByRecent(typeFiltered.filter(isHistoryOrder))
    }
  }, [orders, typeFilter])

  const filteredOrders = useMemo(
    () => [...recentOrders, ...pastOrders],
    [recentOrders, pastOrders]
  )

  const renderHistoryCard = (order) => {
    const status = STATUS_STYLES[order.status] || STATUS_STYLES.cancelled
    const productName = getOrderProductName(order)
    const productImg = getOrderProductImage(order)
    const isService = isOrderService(order)
    const updatedAt = order.updatedAt || order.updated_at
    const bookingSummary = isService ? getBookingSummary(order.booking) : null
    const isActive = isActiveOrder(order)

    return (
      <button
        key={order.id}
        type="button"
        onClick={() => navigate(`/user/orders/${order.id}`)}
        className={`w-full text-left rounded-xl bg-white border shadow-sm overflow-hidden hover:shadow-md transition-all active:scale-[0.99] ${
          isActive
            ? 'border-blue-200 ring-1 ring-blue-100 hover:border-blue-300'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div
          className={`flex items-start justify-between gap-3 p-4 border-b border-slate-100 ${
            isActive ? 'bg-gradient-to-r from-blue-50 to-white' : 'bg-gradient-to-r from-slate-50 to-white'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  isService ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isService ? 'Service' : 'Product'}
              </span>
              <p className="text-[10px] uppercase text-slate-500 tracking-widest truncate font-medium">
                #{order.orderNumber}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <FaClock className="w-3 h-3" />
              {formatOrderDate(updatedAt || order.createdAt || order.created_at)}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-4 p-4 items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner shrink-0">
            {productImg ? (
              <img src={productImg} alt={productName} className="w-full h-full object-cover" />
            ) : isService ? (
              <FaHandshake className="w-7 h-7 text-slate-300" />
            ) : (
              <FaBox className="w-7 h-7 text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{productName}</h3>
            <p className="text-xs text-slate-500">
              Qty <span className="text-slate-900 font-bold">{order.quantity}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="text-blue-600 font-bold">₹{getOrderTotal(order)}</span>
            </p>
            {!isService && (
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 w-fit">
                  🚚 Expected Arrival: On or before {calculateArrivalDate(order.createdAt || order.created_at, order.delivery_span)}
                </span>
              </div>
            )}
            {bookingSummary && (
              <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                <FaCalendarDays className="w-3 h-3" />
                {bookingSummary}
              </p>
            )}
          </div>
          <FaChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 pb-24 lg:pb-6">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="p-4 md:p-5 max-w-5xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate('/user/orders')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          Back to Active Orders
        </button>

        <div className="text-center space-y-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <FaClock className="w-10 h-10 text-indigo-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Order History</h1>
          <p className="text-sm text-slate-600">
            Hi {user?.first_name || 'there'}, browse all your recent and past {typeFilter === 'product' ? 'product' : 'service'} orders.
          </p>

          <div className="relative flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full max-w-[400px] mx-auto h-14 overflow-hidden mt-6">
            <motion.div
              className="absolute top-1.5 bottom-1.5 bg-white rounded-lg shadow-lg shadow-indigo-500/10 border border-indigo-50/50"
              initial={false}
              animate={{
                left: typeFilter === 'product' ? '6px' : 'calc(50% + 3px)',
                right: typeFilter === 'product' ? 'calc(50% + 3px)' : '6px'
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            {[
              { id: 'product', label: 'Products', icon: FaBox },
              { id: 'service', label: 'Services', icon: FaHandshake }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-2 z-10 transition-colors duration-300 border-0 bg-transparent cursor-pointer ${
                  typeFilter === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-slate-600 py-10 bg-white rounded-xl border border-slate-200 shadow-sm">
            Loading order history...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
              <FaClock className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium">
              No {typeFilter === 'product' ? 'product' : 'service'} history yet.
            </p>
            <p className="text-sm text-slate-500">
              Your recent and past orders will appear here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/user/orders')}
              className="px-6 py-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition"
            >
              View Active Orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </p>

            {recentOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-blue-700 uppercase tracking-widest">Recent Orders</h2>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    {recentOrders.length} active
                  </span>
                </div>
                {recentOrders.map(renderHistoryCard)}
              </div>
            )}

            {pastOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Past Orders</h2>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {pastOrders.length} completed / cancelled
                  </span>
                </div>
                {pastOrders.map(renderHistoryCard)}
              </div>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  )
}

export default UserOrderHistory
