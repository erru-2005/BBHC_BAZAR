import { FiSearch, FiBell } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fixImageUrl } from '../../../utils/image'

export default function SellerHeader({ onOpenProfile }) {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-slate-200/40 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20">
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search analytics, inventory..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm md:text-base font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <button 
          onClick={() => navigate('/seller/dashboard', { state: { view: 'notifications' } })}
          className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all group"
        >
          <FiBell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>

        <div className="h-6 w-px bg-slate-200/60 shadow-sm"></div>

        <div 
          onClick={onOpenProfile}
          className="flex items-center gap-4 cursor-pointer group hover:opacity-80 transition-opacity"
        >
          <div className="text-right flex flex-col hidden lg:flex">
            <span className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors capitalize tracking-tight">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || user?.full_name || 'Seller Account')}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:border-blue-50">
            {user?.image_url || user?.image ? (
                <img 
                  src={fixImageUrl(user.image_url || user.image)} 
                  alt="Profile" 
                  className="w-full h-full object-cover scale-110" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 font-black font-outfit text-lg">
                  {user?.first_name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
