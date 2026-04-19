import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiMenu, FiRefreshCw, FiBriefcase, FiSearch, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { getServices } from '../../services/api'
import { getImageUrl } from '../../utils/image'

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
}

function SellerMyServices() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      setError(null)
      try {
        const serviceList = await getServices()
        const normalized = Array.isArray(serviceList) ? serviceList : []
        setServices(normalized)
      } catch (err) {
        setError(err.message || 'Failed to load services')
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [refreshToken])

  const ownedServices = useMemo(() => {
    if (!user) return []
    const sellerTradeId = user.trade_id
    const sellerId = String(user.id || user._id || '')

    const filtered = services.filter((service) => {
      const matchTradeId =
        sellerTradeId &&
        (service.seller_trade_id === sellerTradeId ||
          service.created_by === sellerTradeId ||
          service.created_by_user_id === sellerTradeId)
      const matchId =
        sellerId &&
        (String(service.created_by_user_id || '') === sellerId ||
          String(service.seller_id || '') === sellerId)

      return matchTradeId || matchId
    })

    if (!searchQuery) return filtered
    const lowerQuery = searchQuery.toLowerCase()
    return filtered.filter(s => s.service_name?.toLowerCase().includes(lowerQuery))
  }, [services, user, searchQuery])

  return (
    <div className="min-h-screen bg-slate-50/50 pb-[120px] md:pb-20">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/seller/dashboard')}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 md:hidden"
            >
              <FiMenu className="h-6 w-6" />
            </motion.button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase">Expertise</span>
                 <span className="text-xl font-black text-blue-600 tracking-tight font-outfit uppercase">Vault</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Deployment Control</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors w-4 h-4" strokeWidth={3} />
              <input
                type="text"
                placeholder="LOCATE SERVICE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all w-64 shadow-inner tracking-widest"
              />
            </div>
            <motion.button
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={loading}
              onClick={() => setRefreshToken((prev) => prev + 1)}
              className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center"
            >
              <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-blue-600' : ''}`} strokeWidth={3} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-outfit">Deployed Services</h1>
            <p className="text-sm font-bold text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              LIVE INVENTORY: {ownedServices.length} ACTIVE ASSETS
            </p>
          </div>
          <button 
             onClick={() => navigate('/seller/services/new')}
             className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-black transition-all group active:scale-95"
          >
             INITIALIZE NEW ASSET
          </button>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 border border-rose-100 bg-rose-50 px-6 py-4 text-xs font-black uppercase tracking-widest text-rose-600 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-600" />
            {error}
          </motion.div>
        )}

        {/* Mobile Search Bar */}
        <div className="relative group sm:hidden mb-8">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" strokeWidth={3} />
          <input
            type="text"
            placeholder="LOCATE ASSET..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-black text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 w-full animate-pulse rounded-[3rem] bg-white border border-slate-100" />
              ))}
            </div>
          ) : ownedServices.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-dashed border-slate-200 rounded-[4rem] px-10 py-32 text-center flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-100">
                 <FiBriefcase className="h-12 w-12" />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Inventory Exhausted</h3>
                 <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">No service assets registered in this sector.</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/seller/services/new')}
                className="mt-4 px-10 py-5 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-blue-500/30"
              >
                + Deploy Protocol
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {ownedServices.map((service) => {
                const isApproved = service.approval_status === 'approved'
                return (
                  <motion.div
                    key={service.id || service._id}
                    layout
                    variants={itemVariants}
                    whileHover={{ y: -10 }}
                    className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)] overflow-hidden group cursor-pointer flex flex-col p-4"
                  >
                    <div className="relative h-60 w-full overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-inner">
                      {service.thumbnail ? (
                        <img
                          src={getImageUrl(service.thumbnail)}
                          alt={service.service_name}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-200">
                           <FiBriefcase className="w-16 h-16 opacity-30" />
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl backdrop-blur-xl border flex items-center gap-2 ${isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
                          {isApproved ? 'Active' : 'Awaiting'}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                          {service.categories?.[0] || 'CLASS A'}
                        </span>
                      </div>
                      
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-outfit leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                        {service.service_name}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-bold mb-6 line-clamp-2 uppercase tracking-wide opacity-70 leading-relaxed">{service.description}</p>
                      
                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Rate</span>
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(service.service_charge)}</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center text-slate-300 group-hover:text-white transition-all shadow-sm">
                           <FiCheckCircle className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default SellerMyServices
