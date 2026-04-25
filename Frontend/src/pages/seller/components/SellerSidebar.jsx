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
import { useSelector } from 'react-redux'
import { fixImageUrl } from '../../../utils/image'
import { useNavigate } from 'react-router-dom'

export default function SellerSidebar({ onOpenAddProduct }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  
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
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">BBHC</span>
                  <span className="text-2xl font-bold text-[#FF3399] tracking-tight filter drop-shadow-[0_2px_10px_rgba(255,51,153,0.3)]">Bazaar</span>
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
                <span className={`text-sm font-semibold tracking-normal transition-colors ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                
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
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/seller/profile')}
          className="bg-white border border-slate-200 rounded-[2rem] p-5 relative overflow-hidden group mb-4 cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0 shadow-inner">
               {user?.image_url || user?.image ? (
                  <div 
                    className="w-full h-full scale-[1.2]" 
                    style={{ 
                        backgroundImage: `url(${fixImageUrl(user.image_url || user.image)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                  />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-600 bg-blue-50 font-bold text-lg uppercase">
                    {user?.first_name?.charAt(0) || 'A'}
                  </div>
               )}
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-bold text-slate-900 line-clamp-1">{user?.first_name || 'Account'}</p>
              <p className="text-xs font-semibold text-slate-400">Verified Seller</p>
            </div>
          </div>
        </motion.div>

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
