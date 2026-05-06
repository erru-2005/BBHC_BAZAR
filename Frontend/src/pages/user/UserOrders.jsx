import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowLeft, FaBox, FaClock, FaTruck, FaDownload, FaCopy, FaQrcode } from 'react-icons/fa6'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrders, cancelOrder } from '../../services/api'
import { getSocket } from '../../utils/socket'

const STATUS_STYLES = {
  pending_seller: { label: 'New Order', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  seller_accepted: { label: 'Accepted', className: 'bg-sky-100 text-sky-800 border border-sky-200' },
  seller_rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 border border-rose-200' },
  handed_over: { label: 'Handed Over', className: 'bg-violet-100 text-violet-800 border border-violet-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
  cancelled_master: { label: 'Master Cancelled', className: 'bg-gray-100 text-gray-700 border border-gray-200' }
}

const TablerXCircle = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9" />
    <path d="M10 10l4 4m0 -4l-4 4" />
  </svg>
)

function UserOrders() {
  const navigate = useNavigate()
  const { user, token } = useSelector((state) => state.auth)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const qrPreviewRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        // Handle both old format (array) and new format (object with orders property)
        const ordersArray = Array.isArray(data) ? data : (data.orders || [])
        setOrders(ordersArray)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  // Real-time Socket.IO updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !token) return

    const handleNewOrder = (orderData) => {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === orderData.id)
        if (exists) return prev
        return [orderData, ...prev]
      })
    }

    const handleOrderUpdated = (orderData) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === orderData.id ? orderData : order))
      )
      // Update active order if it's the one being updated
      if (activeOrder && activeOrder.id === orderData.id) {
        setActiveOrder(orderData)
      }
    }

    socket.on('new_order', handleNewOrder)
    socket.on('order_updated', handleOrderUpdated)

    return () => {
      socket.off('new_order', handleNewOrder)
      socket.off('order_updated', handleOrderUpdated)
    }
  }, [token, activeOrder])

  const handleCancelOrder = async (orderId) => {
    setCancelingId(orderId)
    setError(null)
    try {
      const updated = await cancelOrder(orderId)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelingId(null)
    }
  }

  const copyToken = async (token) => {
    if (!token) return

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(token)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = token
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
          setCopiedToken(token)
          setTimeout(() => setCopiedToken(null), 2000)
        } catch (err) {
          console.error('Fallback copy failed:', err)
          alert('Failed to copy token. Please copy manually: ' + token)
        }
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy token:', err)
      // Fallback: show token in alert
      const textArea = document.createElement('textarea')
      textArea.value = token
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
      } catch (fallbackErr) {
        alert('Failed to copy token. Please copy manually: ' + token)
      }
      document.body.removeChild(textArea)
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
    const image = new Image()
    image.crossOrigin = 'anonymous'

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(url)
        return
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `bbhc-order-${activeOrder.orderNumber}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
    }

    image.src = url
  }

  const getStatusMessage = (order) => {
    switch (order.status) {
      case 'pending_seller':
        return 'Step 1: Order received. Waiting for the seller to confirm your items.'
      case 'seller_accepted':
        return 'Step 2: Seller confirmed! They are now preparing your order for the outlet.'
      case 'handed_over':
        return 'Step 3: Arrived at Outlet. Your product is ready! Visit the BBHCBazaar outlet with your QR code.'
      case 'completed':
        return 'Step 4: Finalized. You have collected your product. Thank you for shopping!'
      case 'seller_rejected':
        return 'The seller could not fulfill this order and has rejected it.'
      case 'cancelled':
      case 'cancelled_master':
        return 'This order has been cancelled and is no longer active.'
      default:
        return 'Your order is currently in progress.'
    }
  }

  const renderOrderCard = (order) => {
    const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending
    const totalAmount = Number(order.totalAmount || order.total_amount || 0).toLocaleString('en-IN')
    const createdAt = order.createdAt || order.created_at
    const productName = order.product?.name || order.product?.product_name || 'Product'
    const productImg = order.product?.thumbnail || order.product?.image || 'https://via.placeholder.com/120?text=BBHC'
    const canCancel = order.status === 'pending_seller'
    const hasQR = order.status === 'seller_accepted' || order.status === 'handed_over' || order.status === 'ready_for_pickup'
    const qrValue = order.secureTokenUser || order.qrCodeData || order.qr_code_data || ''
    const token = order.secureTokenUser || order.secure_token_user || ''

    return (
      <div
        key={order.id}
        className="flex flex-col gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase text-slate-700 tracking-widest truncate">Order #{order.orderNumber}</p>
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
              <FaClock className="w-3 h-3" />
              {createdAt ? new Date(createdAt).toLocaleString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : '—'}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-3 p-4">
          <img
            src={productImg}
            alt={productName}
            className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{productName}</h3>
            <p className="text-xs text-slate-600">Quantity: {order.quantity}</p>
            <p className="text-sm text-slate-700">
              Total: <span className="font-bold">₹{totalAmount}</span>
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <FaTruck className="w-3 h-3" />
              <span className="truncate">{order.pickupLocation || order.pickup_location || 'BBHCBazaar outlet'}</span>
            </p>
          </div>
        </div>

        {token && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-700 font-medium">Token:</span>
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                <p className="text-xs font-mono text-slate-700 break-all flex-1">{token}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    copyToken(token)
                  }}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition border-0 bg-transparent cursor-pointer"
                  title="Copy token"
                >
                  <FaCopy className="w-3 h-3" />
                </button>
                {hasQR && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveOrder(order)
                    }}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition border-0 bg-transparent cursor-pointer"
                    title="View QR Code"
                  >
                    <FaQrcode className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {copiedToken === token && (
              <p className="text-xs text-green-600 font-medium">✓ Token copied!</p>
            )}
          </div>
        )}

        {canCancel && (
          <div className="px-4 pb-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancelOrder(order.id)
              }}
              disabled={cancelingId === order.id}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-100 transition disabled:opacity-50"
            >
              <TablerXCircle className="w-3.5 h-3.5" />
              {cancelingId === order.id ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    )
  }

  const showEmptyState = !loading && orders.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 pb-24 lg:pb-6">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="space-y-4 text-slate-900">


        <div className="p-4 md:p-5 max-w-5xl mx-auto space-y-4">
          <div className="text-center space-y-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <FaBox className="w-10 h-10 text-blue-600 mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">Your Orders</h1>
            <p className="text-sm text-slate-600">
              Hi {user?.first_name || 'there'}, track your purchases and pickup instructions here.
            </p>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-slate-600 py-10 bg-white rounded-2xl border border-slate-200 shadow-sm">Loading your orders...</div>
          ) : showEmptyState ? (
            <div className="border border-slate-200 bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
              <p className="text-slate-600">
                Once you place an order, it will appear here with real-time status updates.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition"
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
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setActiveOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 text-center space-y-4 p-5 sm:p-6 rounded-3xl shadow-2xl"
              style={{ width: 'clamp(18rem, 92vw, 34rem)' }}
            >
              <h3 className="text-2xl font-bold text-emerald-900">Order Details</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{getStatusMessage(activeOrder)}</p>

              {(activeOrder.status === 'cancelled' || activeOrder.status === 'cancelled_master' || activeOrder.status === 'seller_rejected') ? (
                <p className="text-sm text-slate-600">
                  This order is no longer active. QR code is not available.
                </p>
              ) : (activeOrder.status === 'pending_seller') ? (
                <p className="text-sm text-slate-600">
                  Waiting for seller to accept your order. QR code will be available once accepted.
                </p>
              ) : (activeOrder.secureTokenUser || activeOrder.qrCodeData) ? (
                <>
                  <p className="text-sm text-slate-700">
                    Show this code at the BBHCBazaar outlet to complete payment and collect your product.
                  </p>
                  <div className="inline-block bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm" ref={qrPreviewRef}>
                    <QRCode
                      value={activeOrder.secureTokenUser || activeOrder.qrCodeData || activeOrder.qr_code_data || ''}
                      size={200}
                    />
                  </div>
                  {activeOrder.secureTokenUser && (
                    <div className="flex items-center gap-2 justify-center flex-wrap bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-emerald-900 font-mono break-all">
                        Token: {activeOrder.secureTokenUser}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyToken(activeOrder.secureTokenUser)
                        }}
                        className="p-1.5 border border-emerald-200 rounded-md hover:bg-emerald-100 text-emerald-800 transition bg-white cursor-pointer"
                        title="Copy token"
                      >
                        <FaCopy className="w-3 h-3" />
                      </button>
                      {copiedToken === activeOrder.secureTokenUser && (
                        <span className="text-xs text-green-600 font-medium">✓ Copied!</span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={downloadActiveOrderQR}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-700 text-white font-semibold py-2.5 hover:bg-emerald-800 transition"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download QR
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  QR code will be available once the seller accepts your order.
                </p>
              )}

              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                Order #{activeOrder.orderNumber}
              </p>
              <button
                onClick={() => setActiveOrder(null)}
                className="w-full rounded-xl border border-emerald-200 bg-white text-emerald-800 font-semibold py-2.5 hover:bg-emerald-50 transition"
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
