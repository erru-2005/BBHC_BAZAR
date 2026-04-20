import { Link, useLocation } from 'react-router-dom'
import { 
  FiHome, 
  FiFileText, 
  FiBox, 
  FiUsers, 
  FiBarChart2, 
  FiSettings,
  FiPlus
} from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function SellerSidebar({ onOpenAddProduct }) {
  const location = useLocation()
  
  const menuItems = [
    { label: 'Dashboard', icon: FiHome, path: '/seller/dashboard' },
    { label: 'Orders', icon: FiFileText, path: '/seller/dashboard', state: { view: 'orders' } },
    { label: 'Products', icon: FiBox, path: '/seller/products' },
    { label: 'Customers', icon: FiUsers, path: '/seller/customers' },
    { label: 'Analytics', icon: FiBarChart2, path: '/seller/analytics' },
    { label: 'Settings', icon: FiSettings, path: '/seller/settings' },
  ]

  const isActive = (item) => {
    if (item.label === 'Orders') {
        return location.pathname === '/seller/dashboard' && location.state?.view === 'orders'
    }
    if (item.label === 'Dashboard') {
        return location.pathname === '/seller/dashboard' && (!location.state || location.state?.view === 'dashboard')
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 flex flex-col h-screen fixed left-0 top-0 z-30 hidden md:flex">
      <div className="p-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30 text-xl font-outfit">B</div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tight leading-none font-outfit">BBHC</span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1">Bazaar</span>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.label}
                to={item.path}
                state={item.state}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  active 
                    ? 'text-blue-600 bg-blue-50/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                   <item.icon className="w-5 h-5" />
                </div>
                <span className={`font-bold text-[14px] md:text-[15px] tracking-tight uppercase ${active ? 'text-slate-900' : ''}`}>{item.label}</span>
                
                {active && (
                  <motion.div 
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-1.5 h-6 bg-blue-600 rounded-r-full shadow-[2px_0_10px_rgba(37,99,235,0.4)]" 
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-10">
        <div className="bg-slate-900 rounded-[2rem] p-6 relative overflow-hidden group mb-6">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Need help?</p>
           <p className="text-sm font-black text-white mb-4">Upgrade to Pro for more analytics</p>
           <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">Learn More →</button>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(37, 99, 235, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenAddProduct}
          className="w-full relative group h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center gap-4 text-white shadow-xl shadow-blue-500/20 transition-all overflow-hidden"
        >
           {/* Animated Shine Effect */}
           <motion.div 
             className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
           />
           
           <motion.div
             animate={{ rotate: [0, 90, 0] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
             className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"
           >
             <FiPlus className="w-4 h-4" strokeWidth={3} />
           </motion.div>
           
           <span className="font-black text-[13px] tracking-[0.2em] uppercase">Add Listing</span>
        </motion.button>
      </div>
    </aside>
  )
}
