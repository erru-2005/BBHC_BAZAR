import { motion } from 'framer-motion'
import { FiBell, FiArrowLeft, FiInfo, FiAlertCircle, FiCheckCircle, FiPackage, FiShoppingBag, FiClock, FiXCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function SellerNotifications() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const { orders } = useSelector((state) => state.seller)

  // Generate dynamic notifications from order history
  const notifications = (() => {
    const list = []
    
    if (!orders || !Array.isArray(orders)) return list

    orders.forEach(order => {
      // 1. Notification for the order itself (creation)
      list.push({
        id: `new-${order.id || order._id}`,
        title: "New Request Received",
        message: `You received a new ${order.booking ? 'service' : 'product'} request for "${order.product_snapshot?.name || 'Product'}" from ${order.user_snapshot?.name || 'a customer'}.`,
        time: order.created_at,
        unread: order.status === 'pending_seller',
        type: "order",
        icon: FiShoppingBag,
        color: "blue",
        timestamp: new Date(order.created_at).getTime()
      })

      // 2. Notifications for status changes
      if (order.status_history && order.status_history.length > 1) {
        order.status_history.slice(1).forEach((history, idx) => {
          let title = "Order Update"
          let color = "indigo"
          let icon = FiClock

          if (history.status === 'completed' || history.status === 'delivered' || history.status === 'handed_over') {
            title = "Order Fulfilled"
            color = "emerald"
            icon = FiCheckCircle
          } else if (history.status === 'seller_rejected' || history.status === 'cancelled' || history.status === 'rejected') {
            title = "Order Terminated"
            color = "rose"
            icon = FiXCircle
          } else if (history.status === 'seller_accepted' || history.status === 'accepted') {
            title = "Order Accepted"
            color = "blue"
            icon = FiCheckCircle
          }

          list.push({
            id: `status-${order.id || order._id}-${idx}`,
            title,
            message: history.note || `Order #${order.orderNumber || order.order_number || order.id} status changed to ${history.status.replace(/_/g, ' ')}.`,
            time: history.timestamp,
            unread: false,
            type: "status",
            icon,
            color,
            timestamp: new Date(history.timestamp).getTime()
          })
        })
      }
    })

    // Sort by most recent first
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
  })()

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getColorClasses = (color) => {
    const map = {
      blue: 'bg-blue-50 text-blue-600',
      amber: 'bg-amber-50 text-amber-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      rose: 'bg-rose-50 text-rose-600'
    }
    return map[color] || map.blue
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/seller/dashboard', { state: { view: 'dashboard' } })}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Notifications</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Keep track of your business alerts and updates</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 text-[10px] md:text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm">
          {notifications.filter(n => n.unread).length} New Messages
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-4">
        {notifications.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <FiBell className="w-10 h-10" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No recent notifications</p>
          </div>
        ) : (
          notifications.map((notif, idx) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden group shadow-sm transition-all ${notif.unread ? 'border-l-4 border-l-blue-600 shadow-md' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${getColorClasses(notif.color)}`}>
                 <notif.icon className="w-7 h-7" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-black tracking-tight ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTime(notif.time)}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {notif.message}
                </p>
              </div>

              {notif.unread && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
              )}
            </motion.div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors border-t border-slate-100 mt-4">
          Load Older Notifications
        </button>
      )}
    </div>
  )
}
