import { Link, useLocation } from 'react-router-dom'
import { 
  FiHome, 
  FiFileText, 
  FiBox, 
  FiBarChart2, 
  FiSettings,
  FiPlus
} from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function SellerSidebar({ onOpenAddProduct }) {
  const location = useLocation()
  
  const menuItems = [
    { label: 'Dashboard', icon: FiHome, path: '/seller/dashboard', state: { view: 'dashboard' } },
    { label: 'Orders', icon: FiFileText, path: '/seller/dashboard', state: { view: 'orders' } },
    { label: 'Products', icon: FiBox, path: '/seller/products' },
    { label: 'Analytics', icon: FiBarChart2, path: '/seller/dashboard', state: { view: 'analytics' } },
    { label: 'Settings', icon: FiSettings, path: '/seller/settings' },
  ]

  const isActive = (item) => {
    if (item.label === 'Orders' || item.label === 'Dashboard' || item.label === 'Analytics') {
        const viewOverride = item.state?.view || 'dashboard'
        return location.pathname === '/seller/dashboard' && (location.state?.view === viewOverride || (!location.state?.view && viewOverride === 'dashboard'))
    }
    return location.pathname === item.path
  }

  return (
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 flex flex-col h-screen fixed left-0 top-0 z-30 hidden md:flex">
      <div className="p-8">
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="relative group cursor-pointer"
          >
            {/* High-end Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-all duration-1000 group-hover:duration-300 animate-pulse" />
            
            <div className="relative flex items-center justify-center bg-white/90 backdrop-blur-md rounded-[1.75rem] py-4 px-6 border border-white shadow-2xl overflow-hidden">
               {/* Shine Animation */}
               <motion.div 
                 animate={{ left: ['-100%', '200%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                 className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
               />
               
               <div className="flex items-center gap-0.5">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter font-outfit">BBHC</span>
                  <span className="text-2xl font-black text-[#FF3399] tracking-tighter font-outfit filter drop-shadow-[0_2px_10px_rgba(255,51,153,0.3)]">Bazaar</span>
               </div>
            </div>
          </motion.div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.label}
                to={item.path}
                state={item.state}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  active 
                    ? 'text-blue-600 bg-blue-50/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                   <item.icon className="w-5 h-5" />
                </div>
                <span className={`font-bold text-[11px] md:text-[12px] tracking-tight uppercase ${active ? 'text-slate-900' : ''}`}>{item.label}</span>
                
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

      <div className="mt-auto p-8 pt-0">
        <div className="bg-slate-900 rounded-[2rem] p-5 relative overflow-hidden group mb-4">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity" />
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Need help?</p>
           <p className="text-[11px] font-black text-white mb-3">Upgrade to Pro</p>
           <button className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">Learn More →</button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 10px 20px -10px rgba(37, 99, 235, 0.4)" }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenAddProduct}
          className="w-full relative group h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center gap-3 text-white shadow-lg transition-all overflow-hidden"
        >
           <FiPlus className="w-4 h-4" strokeWidth={3} />
           <span className="font-black text-[10px] tracking-[0.2em] uppercase">Add Listing</span>
        </motion.button>
      </div>
    </aside>
  )
}
