import { FiSearch, FiBell } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fixImageUrl } from '../../../utils/image'

export default function SellerHeader({ onOpenProfile }) {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  return (
    <header className="h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        {/* Innovative Logo with Professional Shine */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/seller/dashboard')}
          className="relative group cursor-pointer flex-shrink-0 md:hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-10 group-hover:opacity-30 transition-all duration-500" />
          
          <div className="relative flex items-center bg-white border border-slate-200/60 rounded-xl py-2 px-3.5 shadow-sm overflow-hidden">
             {/* Professional Shimmer */}
             <motion.div 
               animate={{ left: ['-100%', '200%'] }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
               className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12 pointer-events-none"
             />
             
             <div className="flex items-center gap-1">
                <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">BBHC</span>
                <span className="text-xl md:text-2xl font-bold text-[#FF3399] tracking-tight">Bazaar</span>
             </div>
          </div>
        </motion.div>

        {/* Search - Integrated Search Bar */}
        <div className="hidden sm:block flex-1 max-w-md ml-6">
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4.5 h-4.5" />
            <input 
              type="text" 
              placeholder="Search products, orders..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        <button 
          onClick={() => navigate('/seller/dashboard', { state: { view: 'notifications' } })}
          className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          <FiBell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>

        <div className="h-6 w-px bg-slate-200/60 hidden md:block"></div>

        <div 
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group px-1.5 py-1 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="text-right flex flex-col hidden lg:flex">
            <span className="text-sm font-bold text-slate-900 transition-colors capitalize">
              {user?.first_name ? `${user.first_name}` : (user?.name?.split(' ')[0] || 'Account')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm transition-all group-hover:border-blue-400">
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
                <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-base">
                  {user?.first_name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
