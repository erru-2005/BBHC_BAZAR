import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowLeft, FaBox, FaClock, FaTruck, FaCircleXmark, FaDownload, FaCopy, FaQrcode } from 'react-icons/fa6'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrders, cancelOrder } from '../../services/api'
import { initSocket } from '../../utils/socket'

const STATUS_STYLES = {
  pending_seller: { label: 'Pending', className: 'bg-red-100 text-red-800 border border-red-500' },
  seller_accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800 border border-blue-500' },
  seller_rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border border-red-500' },
  ready_for_pickup: { label: 'Ready', className: 'bg-green-100 text-green-800 border border-green-500' },
  handed_over: { label: 'Handed Over', className: 'bg-yellow-100 text-yellow-800 border border-yellow-500' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border border-green-500' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 border border-gray-500' },
  cancelled_master: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border border-red-500' },
  pending: { label: 'Pending', className: 'bg-red-100 text-red-800 border border-red-500' },
  accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800 border border-blue-500' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border border-red-500' }
}

function UserOrders() {
  const navigate = useNavigate()
  const { user, token } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)
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
    if (!token) return

    const socket = initSocket(token)
    
    socket.on('connect', () => {
      if (user?.id) {
        socket.emit('user_authenticated', {
          user_id: user.id,
          user_type: 'user'
        })
      }
    })

    socket.on('new_order', (orderData) => {
      setOrders((prev) => {
        const exists = prev.find((o) => o.id === orderData.id)
        if (exists) return prev
        return [orderData, ...prev]
      })
    })

    socket.on('order_updated', (orderData) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === orderData.id ? orderData : order))
      )
      // Update active order if it's the one being updated
      if (activeOrder && activeOrder.id === orderData.id) {
        setActiveOrder(orderData)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user, activeOrder])

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
        return 'Waiting for seller confirmation'
      case 'seller_accepted':
        return 'Seller has confirmed your order. QR code is ready for pickup.'
      case 'seller_rejected':
        return 'Seller has rejected this order.'
      case 'handed_over':
        return 'Product has been handed over at outlet. You can now collect it.'
      case 'completed':
        return 'Order completed successfully!'
      case 'cancelled':
      case 'cancelled_master':
        return 'This order has been cancelled.'
      default:
        return 'Order is being processed.'
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
        className="flex flex-col gap-3 bg-gray-50 border border-black"
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-black">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase text-black tracking-widest truncate">Order #{order.orderNumber}</p>
            <p className="text-xs text-black flex items-center gap-1 mt-1">
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
          <span className={`px-2 py-1 text-xs font-semibold whitespace-nowrap ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-3 p-4">
          <img
            src={productImg}
            alt={productName}
            className="w-16 h-16 object-cover border border-black flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-black truncate">{productName}</h3>
            <p className="text-xs text-black">Quantity: {order.quantity}</p>
            <p className="text-sm text-black">
              Total: <span className="font-bold">₹{totalAmount}</span>
            </p>
            <p className="text-xs text-black flex items-center gap-1">
              <FaTruck className="w-3 h-3" />
              <span className="truncate">{order.pickupLocation || order.pickup_location || 'BBHCBazaar outlet'}</span>
            </p>
          </div>
        </div>

        {token && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-black font-medium">Token:</span>
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-gray-300 px-2 py-1">
                <p className="text-xs font-mono text-black break-all flex-1">{token}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    copyToken(token)
                  }}
                  className="flex-shrink-0 p-1 hover:bg-black hover:text-white transition border-0 bg-transparent cursor-pointer"
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
                    className="flex-shrink-0 p-1 hover:bg-black hover:text-white transition border-0 bg-transparent cursor-pointer"
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
              className="w-full inline-flex items-center justify-center gap-2 border border-red-500 bg-red-50 text-red-700 font-semibold py-2 hover:bg-red-100 transition disabled:opacity-50"
            >
              <FaCircleXmark className="w-4 h-4" />
              {cancelingId === order.id ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    )
  }

  const showEmptyState = !loading && orders.length === 0

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-6">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="space-y-4 text-black">
        

        <div className="border-b border-black p-4 space-y-3">
          <div className="text-center space-y-2">
            <FaBox className="w-10 h-10 text-black mx-auto" />
            <h1 className="text-xl font-bold">Your Orders</h1>
            <p className="text-sm text-black">
              Hi {user?.first_name || 'there'}, track your purchases and pickup instructions here.
            </p>
          </div>

          {error && (
            <div className="border border-red-500 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-black py-10">Loading your orders...</div>
          ) : showEmptyState ? (
            <div className="border border-black bg-gray-50 p-6 text-center space-y-4">
              <p className="text-black">
                Once you place an order, it will appear here with real-time status updates.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 border border-black bg-white text-black font-semibold hover:bg-black hover:text-white transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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
              className="bg-white border border-black w-full max-w-md text-center space-y-4 p-6"
            >
              <h3 className="text-lg font-semibold text-black">Order Details</h3>
              <p className="text-sm text-black">{getStatusMessage(activeOrder)}</p>
              
              {(activeOrder.status === 'cancelled' || activeOrder.status === 'cancelled_master' || activeOrder.status === 'seller_rejected') ? (
                <p className="text-sm text-black">
                  This order is no longer active. QR code is not available.
                </p>
              ) : (activeOrder.status === 'pending_seller') ? (
                <p className="text-sm text-black">
                  Waiting for seller to accept your order. QR code will be available once accepted.
                </p>
              ) : (activeOrder.secureTokenUser || activeOrder.qrCodeData) ? (
                <>
                  <p className="text-sm text-black">
                    Show this code at the BBHCBazaar outlet to complete payment and collect your product.
                  </p>
                  <div className="inline-block bg-white border border-black p-4" ref={qrPreviewRef}>
                    <QRCode
                      value={activeOrder.secureTokenUser || activeOrder.qrCodeData || activeOrder.qr_code_data || ''}
                      size={200}
                    />
                  </div>
                  {activeOrder.secureTokenUser && (
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <p className="text-xs text-black font-mono break-all">
                        Token: {activeOrder.secureTokenUser}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyToken(activeOrder.secureTokenUser)
                        }}
                        className="p-1 border border-black hover:bg-black hover:text-white transition bg-white cursor-pointer"
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
                    className="w-full inline-flex items-center justify-center gap-2 border border-black bg-white text-black font-semibold py-3 hover:bg-black hover:text-white transition"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download QR
                  </button>
                </>
              ) : (
                <p className="text-sm text-black">
                  QR code will be available once the seller accepts your order.
                </p>
              )}
              
              <p className="text-xs text-black uppercase tracking-widest">
                Order #{activeOrder.orderNumber}
              </p>
              <button
                onClick={() => setActiveOrder(null)}
                className="w-full border border-black bg-white text-black font-semibold py-3 hover:bg-black hover:text-white transition"
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
