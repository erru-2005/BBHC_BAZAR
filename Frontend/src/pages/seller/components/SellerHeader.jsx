import { FiSearch, FiBell, FiAward, FiTrendingUp, FiZap, FiTarget, FiPlus, FiDollarSign, FiHome, FiGrid, FiBarChart2, FiSettings, FiBriefcase, FiShoppingBag } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { fixImageUrl } from '../../../utils/image'
import { useState, useEffect } from 'react'
import { addSellerCredits } from '../../../services/api'
import { updateUserInfo } from '../../../store/authSlice'
import Portal from '../../../components/Portal'

const insights = [
  { text: "Market Trend: Electronics up by 15%", icon: FiTrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
  { text: "Tip: High-res images increase sales by 2x", icon: FiZap, color: "text-amber-500", bg: "bg-amber-50" },
  { text: "Your Store is in the Top 5% this month!", icon: FiAward, color: "text-emerald-500", bg: "bg-emerald-50" },
  { text: "Price Alert: 2 items need optimization", icon: FiTarget, color: "text-rose-500", bg: "bg-rose-50" },
]

const CreditCoin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-sm">
    <circle cx="12" cy="12" r="10" fill="url(#coin_grad)" stroke="#EAB308" strokeWidth="0.5"/>
    <circle cx="12" cy="12" r="7" stroke="#FDE047" strokeWidth="1" strokeDasharray="2 2"/>
    <path d="M12 7V17M12 7L9 10M12 7L15 10" stroke="#854D0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="coin_grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047"/>
        <stop offset="1" stopColor="#EAB308"/>
      </linearGradient>
    </defs>
  </svg>
)

function AddCreditsModal({ isOpen, onClose, onAdded }) {
  const { user } = useSelector((state) => state.auth)
  const [amount, setAmount] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAdd = async () => {
    if (amount <= 0) return
    setLoading(true)
    setError(null)
    try {
      const response = await addSellerCredits(user.id || user._id, amount)
      onAdded(response.credits)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] grid place-items-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 my-auto"
        >
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                <CreditCoin />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Add Credits</h3>
                <p className="text-sm text-slate-500">Boost your store visibility</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[50, 100, 500].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`py-3 rounded-2xl font-bold text-sm transition-all ${
                      amount === val 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-400 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none transition-all"
                  placeholder="Enter custom amount"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <CreditCoin />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-bold ml-1">{error}</p>}

              <button
                onClick={handleAdd}
                disabled={loading || amount <= 0}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiPlus className="w-5 h-5" />
                    Confirm Addition
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  )
}

export default function SellerHeader({ onOpenProfile }) {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const location = useLocation()
  const [insightIndex, setInsightIndex] = useState(0)
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [localCredits, setLocalCredits] = useState(user?.credits || 0)

  useEffect(() => {
    const timer = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % insights.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user?.credits !== undefined) {
      setLocalCredits(user.credits)
    }
  }, [user?.credits])

  const currentInsight = insights[insightIndex]
  const InsightIcon = currentInsight.icon

  const handleCreditsAdded = (newTotal) => {
    setLocalCredits(newTotal)
    dispatch(updateUserInfo({ credits: newTotal }))
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome, path: '/seller/dashboard' },
    { id: 'orders', label: 'Orders', icon: FiShoppingBag, path: '/seller/dashboard', state: { view: 'orders' } },
    { id: 'wallet', label: 'Wallet', icon: FiDollarSign, path: '/seller/dashboard', state: { view: 'wallet' } },
    { id: 'products', label: 'Products', icon: FiGrid, path: '/seller/products' },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2, path: '/seller/dashboard', state: { view: 'analytics' } },
    { id: 'settings', label: 'Settings', icon: FiSettings, path: '/seller/settings' },
  ]

  return (
    <header className="bg-white/95 md:bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 sticky top-0 z-40">
      <AnimatePresence>
        {isCreditModalOpen && (
          <AddCreditsModal 
            isOpen={isCreditModalOpen} 
            onClose={() => setIsCreditModalOpen(false)} 
            onAdded={handleCreditsAdded}
          />
        )}
      </AnimatePresence>
      
      {/* Row 1: Logo & Profile */}
      <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 flex-1">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/seller/dashboard')}
            className="relative group cursor-pointer flex-shrink-0"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-10 group-hover:opacity-30 transition-all duration-500" />
            
            <div className="relative flex items-center bg-white border border-slate-200/60 rounded-xl py-1.5 md:py-2 px-3 md:px-3.5 shadow-sm overflow-hidden">
               <motion.div 
                 animate={{ left: ['-100%', '200%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                 className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12 pointer-events-none"
               />
               
               <div className="flex items-center gap-1">
                  <span className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">BBHC</span>
                  <span className="text-lg md:text-2xl font-bold text-[#FF3399] tracking-tight">Bazaar</span>
               </div>
            </div>
          </motion.div>

          {/* Desktop Insights */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl px-4 py-2 flex-1 max-w-2xl ml-6 group hover:bg-white hover:border-blue-200 transition-all duration-300">
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
          {/* Desktop Credits (Hidden on Mobile) */}
          <div 
            onClick={() => navigate('/seller/dashboard', { state: { view: 'wallet' } })}
            className="hidden md:flex items-center gap-2 bg-amber-50 border border-amber-200/50 rounded-2xl px-3 py-1.5 shadow-sm group/credit transition-all hover:bg-white hover:border-amber-300 cursor-pointer"
          >
            <CreditCoin />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">Credits</span>
              <span className="text-sm font-black text-slate-900">{localCredits}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsCreditModalOpen(true)
              }}
              className="ml-1 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-amber-200/50 hover:bg-amber-600 transition-all active:scale-90"
            >
              <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

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
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm transition-all group-hover:border-blue-400">
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
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm md:text-base">
                    {user?.first_name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Subheader (Mobile Only) */}
      <div className="md:hidden flex flex-col gap-3 px-4 pb-4 overflow-hidden border-t border-slate-100/50 pt-3">
        <div className="flex items-center justify-between gap-4">
          {/* Horizontal Menu Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 pb-1">
            {menuItems.map((item) => {
              const currentView = location.state?.view || (location.pathname === '/seller/dashboard' ? 'dashboard' : '')
              const isActive = (item.state?.view && item.state.view === currentView) || 
                             (item.id === 'dashboard' && currentView === 'dashboard') ||
                             (item.path === location.pathname && !item.state && !location.state?.view)
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path, { state: item.state })}
                  className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-400'}`}>
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="w-px h-8 bg-slate-200/50 shrink-0" />

          {/* Mobile Credits */}
          <div 
            onClick={() => navigate('/seller/dashboard', { state: { view: 'wallet' } })}
            className="flex items-center gap-2 bg-amber-50 border border-amber-200/50 rounded-xl px-2.5 py-1.5 shadow-sm shrink-0"
          >
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Credits</span>
              <span className="text-xs font-black text-slate-900">{localCredits}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsCreditModalOpen(true)
              }}
              className="w-5 h-5 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-amber-200/50"
            >
              <FiPlus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

