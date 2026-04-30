import { FiSearch, FiBell, FiAward, FiTrendingUp, FiZap, FiTarget } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fixImageUrl } from '../../../utils/image'
import { useState, useEffect } from 'react'

const insights = [
  { text: "Market Trend: Electronics up by 15%", icon: FiTrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
  { text: "Tip: High-res images increase sales by 2x", icon: FiZap, color: "text-amber-500", bg: "bg-amber-50" },
  { text: "Your Store is in the Top 5% this month!", icon: FiAward, color: "text-emerald-500", bg: "bg-emerald-50" },
  { text: "Price Alert: 2 items need optimization", icon: FiTarget, color: "text-rose-500", bg: "bg-rose-50" },
]

export default function SellerHeader({ onOpenProfile }) {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const [insightIndex, setInsightIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % insights.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const currentInsight = insights[insightIndex]
  const InsightIcon = currentInsight.icon

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

        {/* Dynamic Seller Growth Hub - Replaces Redundant Search */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl px-4 py-2 flex-1 max-w-2xl ml-6 group hover:bg-white hover:border-blue-200 transition-all duration-300">
          {/* Seller Tier */}
          <div className="flex items-center gap-3 border-r border-slate-200/60 pr-4">
             <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-amber-400 shadow-lg">
                  <FiAward className="w-5 h-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Tier Status</span>
                <span className="text-[11px] font-bold text-slate-900">PLATINUM</span>
             </div>
          </div>

          {/* Insights Ticker */}
          <div className="flex-1 overflow-hidden relative h-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={insightIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 100 }}
                className="flex items-center gap-3 absolute inset-0"
              >
                <div className={`p-1.5 rounded-lg ${currentInsight.bg} ${currentInsight.color}`}>
                   <InsightIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 tracking-tight">
                  {currentInsight.text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Performance Pulse */}
          <div className="flex items-center gap-4 border-l border-slate-200/60 pl-4">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Growth Score</span>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-bold text-emerald-600">+12.4%</span>
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
                 />
               </div>
            </div>
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

