import { motion } from 'framer-motion'
import { FiBell, FiArrowLeft, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

export default function SellerNotifications() {
  const navigate = useNavigate()

  const notifications = [
    {
      id: 1,
      title: "New Policy Update",
      message: "Admin has updated the seller commission rates for the Electronics category. Please review the updated terms in your settings panel.",
      time: "2 hours ago",
      unread: true,
      type: "admin",
      icon: FiInfo,
      color: "blue"
    },
    {
      id: 2,
      title: "System Maintenance",
      message: "The dashboard will be under maintenance on Sunday from 2 AM to 4 AM. Some features may be temporarily unavailable during this window.",
      time: "5 hours ago",
      unread: false,
      type: "system",
      icon: FiAlertCircle,
      color: "amber"
    },
    {
      id: 3,
      title: "Payout Successful",
      message: "Your weekly payout of ₹12,450 has been processed successfully and credited to your registered bank account.",
      time: "Yesterday",
      unread: false,
      type: "payout",
      icon: FiCheckCircle,
      color: "emerald"
    },
    {
        id: 4,
        title: "Large Order Alert",
        message: "You have received a bulk order for 50 units. Please ensure inventory is ready for handover.",
        time: "2 days ago",
        unread: false,
        type: "order",
        icon: FiBell,
        color: "indigo"
    }
  ]

  const getColorClasses = (color) => {
    const map = {
      blue: 'bg-blue-50 text-blue-600',
      amber: 'bg-amber-50 text-amber-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      indigo: 'bg-indigo-50 text-indigo-600'
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
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-outfit uppercase">Notifications</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Keep track of your business alerts and updates</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 text-[10px] md:text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm">
          {notifications.filter(n => n.unread).length} New Messages
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-4">
        {notifications.map((notif, idx) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`seller-card-premium p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden group hover:active-glow-blue transition-all ${notif.unread ? 'border-l-4 border-l-blue-600' : ''}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${getColorClasses(notif.color)}`}>
               <notif.icon className="w-7 h-7" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-black tracking-tight ${notif.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                  {notif.title}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notif.time}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-serif italic">
                {notif.message}
              </p>
            </div>

            <div className="flex shrink-0">
               <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">Mark as Read</button>
            </div>

            {notif.unread && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            )}
          </motion.div>
        ))}
      </div>

      <button className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors border-t border-slate-100 mt-4">
        Load Older Notifications
      </button>
    </div>
  )
}
