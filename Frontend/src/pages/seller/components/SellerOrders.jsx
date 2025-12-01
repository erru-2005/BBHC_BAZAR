import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { FaCheck, FaXmark, FaQrcode, FaDownload, FaClock } from 'react-icons/fa6'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { getOrders, sellerAcceptOrder, sellerRejectOrder } from '../../../services/api'
import { initSocket } from '../../../utils/socket'

function SellerOrders() {
  const { user, token } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const qrRef = useRef(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        // Filter orders for this seller
        const sellerOrders = data.filter((order) => 
          order.seller_id && String(order.seller_id) === String(user?.id)
        )
        setOrders(sellerOrders)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) {
      fetchOrders()
    }
  }, [user])

  // Real-time Socket.IO updates
  useEffect(() => {
    if (!token || !user?.id) return

    const socket = initSocket(token)
    
    socket.on('connect', () => {
      socket.emit('user_authenticated', {
        user_id: user.id,
        user_type: 'seller'
      })
    })

    socket.on('new_order', (orderData) => {
      // Only add if it's for this seller
      if (orderData.seller_id && String(orderData.seller_id) === String(user.id)) {
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === orderData.id)
          if (exists) return prev
          return [orderData, ...prev]
        })
      }
    })

    socket.on('order_updated', (orderData) => {
      if (orderData.seller_id && String(orderData.seller_id) === String(user.id)) {
        setOrders((prev) =>
          prev.map((order) => (order.id === orderData.id ? orderData : order))
        )
        if (activeOrder && activeOrder.id === orderData.id) {
          setActiveOrder(orderData)
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user, activeOrder])

  const handleAccept = async (orderId) => {
    setProcessingId(orderId)
    setError(null)
    try {
      const updated = await sellerAcceptOrder(orderId)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (orderId, reason = null) => {
    setProcessingId(orderId)
    setError(null)
    try {
      const updated = await sellerRejectOrder(orderId, reason)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const downloadQR = () => {
    if (!qrRef.current || !activeOrder) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `seller-qr-${activeOrder.orderNumber}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending_seller')
  const acceptedOrders = orders.filter((o) => o.status === 'seller_accepted' || o.status === 'handed_over')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">My Orders</h2>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
            {pendingOrders.length} Pending
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
            {acceptedOrders.length} Accepted
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-600">Loading orders...</div>
      ) : (
        <div className="space-y-4">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaClock className="w-5 h-5 text-amber-500" />
                Pending Confirmation ({pendingOrders.length})
              </h3>
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                          Order #{order.orderNumber}
                        </p>
                        <h4 className="text-lg font-semibold text-slate-900 mt-1">
                          {order.product?.name || 'Product'}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Quantity: {order.quantity} × ₹{Number(order.unitPrice || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-lg font-bold text-slate-900 mt-2">
                          Total: ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Customer: {order.user?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAccept(order.id)}
                          disabled={processingId === order.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
                        >
                          <FaCheck className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(order.id)}
                          disabled={processingId === order.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                          <FaXmark className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Orders */}
          {acceptedOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaCheck className="w-5 h-5 text-emerald-500" />
                Accepted Orders ({acceptedOrders.length})
              </h3>
              <div className="space-y-3">
                {acceptedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                    onClick={() => setActiveOrder(order)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                          Order #{order.orderNumber}
                        </p>
                        <h4 className="text-lg font-semibold text-slate-900 mt-1">
                          {order.product?.name || 'Product'}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Status: {order.status === 'handed_over' ? 'Handed Over' : 'Accepted'}
                        </p>
                        {order.secureTokenSeller && (
                          <p className="text-xs text-slate-500 font-mono mt-2">
                            Token: {order.secureTokenSeller}
                          </p>
                        )}
                      </div>
                      <button className="p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                        <FaQrcode className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-600">No orders yet</p>
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {activeOrder && (activeOrder.status === 'seller_accepted' || activeOrder.status === 'handed_over') && (
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
              <h3 className="text-xl font-semibold text-slate-900">Seller QR Code</h3>
              <p className="text-sm text-slate-600">
                Scan this QR code at the outlet when handing over the product.
              </p>
              {activeOrder.secureTokenSeller && (
                <>
                  <div className="inline-block bg-gray-50 border border-gray-200 rounded-2xl p-4" ref={qrRef}>
                    <QRCode value={activeOrder.secureTokenSeller} size={200} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Token: {activeOrder.secureTokenSeller}
                  </p>
                  <button
                    onClick={downloadQR}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white font-semibold py-3 hover:bg-slate-800 transition"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download QR
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveOrder(null)}
                className="w-full rounded-full border border-slate-300 text-slate-700 font-semibold py-3 hover:bg-slate-50 transition"
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

export default SellerOrders

