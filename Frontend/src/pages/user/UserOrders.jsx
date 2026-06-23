import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowLeft, FaBox, FaClock, FaTruck, FaDownload, FaCopy, FaQrcode, FaCircleInfo, FaClockRotateLeft } from 'react-icons/fa6'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrders, cancelOrder } from '../../services/api'
import { getSocket } from '../../utils/socket'
import { STATUS_STYLES, isHistoryOrder, isOrderService } from './utils/orderHelpers'

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
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState('product') // 'product', 'service'

  const activeOrders = useMemo(() => orders.filter((order) => !isHistoryOrder(order)), [orders])

  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      const isService = isOrderService(o)
      return dashboardTypeFilter === 'product' ? !isService : !!isService
    })
  }, [activeOrders, dashboardTypeFilter])

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
        const sReason = order.rejectionReason || order.rejection_reason
        return `The seller could not fulfill this order and has rejected it.${sReason ? ` Reason: ${sReason}` : ''}`
      case 'cancelled':
      case 'cancelled_master':
        const cReason = order.rejectionReason || order.rejection_reason
        return `This order has been cancelled and is no longer active.${cReason ? ` Reason: ${cReason}` : ''}`
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
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isOrderService(order) ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {isOrderService(order) ? 'Service' : 'Product'}
              </span>
              <p className="text-[10px] uppercase text-slate-500 tracking-widest truncate font-medium">Order #{order.orderNumber}</p>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
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
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-4 p-4 items-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner flex-shrink-0">
            {productImg ? (
              <img
                src={productImg}
                alt={productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <FaBox className="w-8 h-8 opacity-20 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-1">{productName}</h3>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500 font-medium">Qty: <span className="text-slate-900 font-bold">{order.quantity}</span></p>
              <div className="w-1 h-1 rounded-full bg-slate-200" />
              <p className="text-xs text-slate-500 font-medium">Total: <span className="text-blue-600 font-bold">₹{totalAmount}</span></p>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium">
              <FaTruck className="w-3 h-3 text-slate-300" />
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

        {(order.status === 'seller_rejected' || order.status === 'cancelled' || order.status === 'cancelled_master') && (
          <div className="mx-4 mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
            <FaCircleInfo className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Order Terminated</p>
              <p className="text-xs text-red-700 leading-relaxed font-medium">
                {order.rejectionReason || order.rejection_reason || 'No specific reason provided.'}
              </p>
            </div>
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

  const showEmptyState = !loading && activeOrders.length === 0

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

            <button
              type="button"
              onClick={() => navigate('/user/orders/history')}
              className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition"
            >
              <FaClockRotateLeft className="w-4 h-4" />
              View Order History
            </button>

            <div className="relative flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full max-w-[400px] mx-auto h-14 overflow-hidden mt-6">
              {/* Animated Background Slider */}
              <motion.div 
                className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-lg shadow-blue-500/10 border border-blue-50/50"
                initial={false}
                animate={{ 
                  left: dashboardTypeFilter === 'product' ? '6px' : 'calc(50% + 3px)',
                  right: dashboardTypeFilter === 'product' ? 'calc(50% + 3px)' : '6px'
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              {[
                { id: 'product', label: 'Products', icon: FaBox },
                { id: 'service', label: 'Services', icon: FaClock }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDashboardTypeFilter(t.id)}
                  className={`relative flex-1 flex items-center justify-center gap-3 z-10 transition-colors duration-300 border-0 bg-transparent cursor-pointer ${
                    dashboardTypeFilter === t.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <t.icon size={16} className={dashboardTypeFilter === t.id ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.label}</span>
                </button>
              ))}
            </div>
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
              {filteredOrders.length > 0 ? (
                filteredOrders.map(renderOrderCard)
              ) : (
                <div className="py-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-50">
                    <FaBox className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No {dashboardTypeFilter}s found</p>
                </div>
              )}
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
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    This order is no longer active. QR code is not available.
                  </p>
                  {(activeOrder.rejectionReason || activeOrder.rejection_reason) && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-left">
                      <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1">Reason for Rejection</p>
                      <p className="text-sm text-red-700 font-medium leading-relaxed">
                        {activeOrder.rejectionReason || activeOrder.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
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
