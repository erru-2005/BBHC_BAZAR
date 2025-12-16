import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FaCheck, FaXmark } from 'react-icons/fa6'
import { getOrders } from '../../../services/api'
import { initSocket } from '../../../utils/socket'

function SellerOrders() {
  const { user, token } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // all | accepted | completed | cancelled | rejected

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await getOrders()
        const orderList = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
          ? data
          : []
        // Filter orders for this seller
        const sellerOrders = orderList.filter((order) => 
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

  // Real-time Socket.IO updates for history view
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
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token, user])

  // History-only view: accepted / completed / delivered / cancelled / rejected
  const acceptedOrders = orders.filter((o) => o.status === 'seller_accepted')
  const completedOrders = orders.filter((o) =>
    ['handed_over', 'completed', 'delivered'].includes(o.status)
  )
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')
  const rejectedOrders = orders.filter((o) =>
    ['seller_rejected', 'rejected'].includes(o.status)
  )

  const showAccepted = statusFilter === 'all' || statusFilter === 'accepted'
  const showCompleted = statusFilter === 'all' || statusFilter === 'completed'
  const showCancelled = statusFilter === 'all' || statusFilter === 'cancelled'
  const showRejected = statusFilter === 'all' || statusFilter === 'rejected'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">My Orders (History)</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              {acceptedOrders.length} Accepted
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {completedOrders.length} Completed
            </span>
            <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
              {cancelledOrders.length} Cancelled
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">
              {rejectedOrders.length} Rejected
            </span>
          </div>
          <div className="ml-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
            >
              <option value="all">All statuses</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
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
          {/* Accepted Orders */}
          {showAccepted && acceptedOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaCheck className="w-5 h-5 text-emerald-500" />
                Accepted Orders ({acceptedOrders.length})
              </h3>
              <div className="space-y-3">
                {acceptedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      Order #{order.orderNumber}
                    </p>
                    <h4 className="text-lg font-semibold text-slate-900 mt-1">
                      {order.product?.name || 'Product'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Quantity: {order.quantity} × ₹
                      {Number(order.unitPrice || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-emerald-700 mt-2 font-semibold">Status: Accepted</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {showCompleted && completedOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaCheck className="w-5 h-5 text-emerald-500" />
                Completed Orders ({completedOrders.length})
              </h3>
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      Order #{order.orderNumber}
                    </p>
                    <h4 className="text-lg font-semibold text-slate-900 mt-1">
                      {order.product?.name || 'Product'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Quantity: {order.quantity} × ₹
                      {Number(order.unitPrice || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-emerald-700 mt-2 font-semibold">Status: Completed</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Orders */}
          {showCancelled && cancelledOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaXmark className="w-5 h-5 text-yellow-500" />
                Cancelled Orders ({cancelledOrders.length})
              </h3>
              <div className="space-y-3">
                {cancelledOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      Order #{order.orderNumber}
                    </p>
                    <h4 className="text-lg font-semibold text-slate-900 mt-1">
                      {order.product?.name || 'Product'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Quantity: {order.quantity} × ₹
                      {Number(order.unitPrice || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-yellow-700 mt-2 font-semibold">Status: Cancelled</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Orders */}
          {showRejected && rejectedOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FaXmark className="w-5 h-5 text-rose-500" />
                Rejected Orders ({rejectedOrders.length})
              </h3>
              <div className="space-y-3">
                {rejectedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-widest">
                      Order #{order.orderNumber}
                    </p>
                    <h4 className="text-lg font-semibold text-slate-900 mt-1">
                      {order.product?.name || 'Product'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Quantity: {order.quantity} × ₹
                      {Number(order.unitPrice || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-rose-700 mt-2 font-semibold">
                      Status: Rejected
                    </p>
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
    </div>
  )
}

export default SellerOrders

