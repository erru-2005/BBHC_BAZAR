import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowLeft, FaBox, FaClock, FaTruck, FaCircleXmark, FaDownload } from 'react-icons/fa6'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrders, cancelOrder } from '../../services/api'

const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40' },
  accepted: { label: 'Ready for pickup', className: 'bg-blue-500/10 text-blue-200 border border-blue-500/40' },
  rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-300 border border-red-500/40' },
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-300 border border-gray-500/40' }
}

function UserOrders() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const qrPreviewRef = useRef(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        setOrders(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const handleCancelOrder = async (orderId) => {
    setCancelingId(orderId)
    setError(null)
    try {
      const updated = await cancelOrder(orderId)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelingId(null)
    }
  }

  const downloadActiveOrderQR = () => {
    if (!qrPreviewRef.current || !activeOrder) return
    const svg = qrPreviewRef.current.querySelector('svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bbhc-order-${activeOrder.orderNumber}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderOrderCard = (order) => {
    const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending
    const totalAmount = Number(order.totalAmount || order.total_amount || 0).toLocaleString('en-IN')
    const createdAt = order.createdAt || order.created_at
    const productName = order.product?.name || order.product?.product_name || 'Product'
    const productImg = order.product?.thumbnail || order.product?.image || 'https://via.placeholder.com/120?text=BBHC'

    return (
      <div
        key={order.id}
        className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 cursor-pointer"
        onClick={() => setActiveOrder(order)}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-white/50 tracking-widest">Order #{order.orderNumber}</p>
            <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
              <FaClock className="w-4 h-4 text-white/40" />
              {createdAt ? new Date(createdAt).toLocaleString() : '—'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-4">
          <img
            src={productImg}
            alt={productName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-white/10"
          />
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-white">{productName}</h3>
            <p className="text-sm text-white/60">Quantity: {order.quantity}</p>
            <p className="text-sm text-white">
              Total: <span className="font-bold">₹{totalAmount}</span>
            </p>
            <p className="text-xs text-white/50 flex items-center gap-2">
              <FaTruck className="w-4 h-4" />
              Pickup: {order.pickupLocation || 'BBHCBazaar outlet'}
            </p>
          </div>
        </div>

        {order.status === 'pending' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCancelOrder(order.id)
            }}
            disabled={cancelingId === order.id}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 text-red-200 font-semibold py-2.5 hover:bg-red-500/20 transition disabled:opacity-50"
          >
            <FaCircleXmark className="w-4 h-4" />
            {cancelingId === order.id ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>
    )
  }

  const showEmptyState = !loading && orders.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131921] via-[#1a2332] to-[#131921] p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto space-y-6 text-white">
        <button
          onClick={() => navigate('/user/profile')}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <FaArrowLeft />
          Back to Profile
        </button>

        <div className="bg-white/10 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-lg shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <FaBox className="w-12 h-12 text-amber-400 mx-auto" />
            <h1 className="text-2xl sm:text-3xl font-bold">Your Orders</h1>
            <p className="text-white/70">
              Hi {user?.first_name || 'there'}, track your purchases and pickup instructions here.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-white/70 py-10">Loading your orders...</div>
          ) : showEmptyState ? (
            <div className="bg-black/20 rounded-2xl border border-white/10 p-8 text-center space-y-4">
              <p className="text-white/70">
                Once you place an order, it will appear here with real-time status updates.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-2xl bg-amber-400/90 text-black font-semibold hover:bg-amber-300 transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(renderOrderCard)}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />

      <AnimatePresence>
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setActiveOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md text-center space-y-4 shadow-2xl"
            >
              <h3 className="text-xl font-semibold text-gray-900">Pickup QR</h3>
              <p className="text-sm text-gray-500">
                Show this code at the BBHCBazaar outlet to complete payment and collect your product.
              </p>
              <div className="inline-block bg-gray-50 border border-gray-200 rounded-2xl p-4" ref={qrPreviewRef}>
                <QRCode value={activeOrder.qrCodeData || activeOrder.qrCode || activeOrder.qr_code_data || ''} size={200} />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                Order #{activeOrder.orderNumber}
              </p>
              <button
                onClick={downloadActiveOrderQR}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 text-white font-semibold py-3 hover:bg-black transition"
              >
                <FaDownload className="w-4 h-4" />
                Download QR
              </button>
              <button
                onClick={() => setActiveOrder(null)}
                className="w-full rounded-full border border-gray-300 text-gray-700 font-semibold py-3 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserOrders

