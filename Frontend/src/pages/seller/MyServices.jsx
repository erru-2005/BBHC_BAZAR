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
    <div className="min-h-screen spatial-bg text-white pb-[96px] md:pb-0">
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/seller/dashboard', { state: { openMenu: true } })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/90 border border-white/10 md:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </motion.button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3.5 py-1.5 shadow-inner ring-1 ring-white/10 backdrop-blur-sm sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-white sm:text-base">BBHC</span>
                <span className="text-sm font-bold text-indigo-300 sm:text-base active-glow">Services</span>
              </div>
            </div>
          </div>
          <span className="hidden text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 sm:inline">
            Marketplace Services
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter">My Services</h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              Active & Pending Listings: {ownedServices.length}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative group flex-1 sm:flex-none">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/30 focus:bg-white/10 transition-all w-full sm:w-72 shadow-inner"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              disabled={loading}
              onClick={() => setRefreshToken((prev) => prev + 1)}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400 rounded-2xl">
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div key="loading" className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-full animate-pulse rounded-[32px] bg-white/[0.03] border border-white/5" />
              ))}
            </motion.div>
          ) : ownedServices.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="spatial-card px-6 py-20 text-center flex flex-col items-center gap-4 opacity-50 grayscale"
            >
              <FiBriefcase className="h-12 w-12 text-indigo-500/30" />
              <p className="text-sm font-black uppercase tracking-widest">No services found</p>
              <button 
                onClick={() => navigate('/seller/services/new')}
                className="mt-2 text-xs font-black text-indigo-400 hover:underline underline-offset-4"
              >
                + Create Your First Service
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4"
            >
              {ownedServices.map((service) => {
                const isApproved = service.approval_status === 'approved'
                return (
                  <motion.div
                    key={service.id || service._id}
                    layout
                    variants={itemVariants}
                    whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.03)' }}
                    className="spatial-card p-4 flex gap-5 items-center group cursor-pointer relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${isApproved ? 'bg-indigo-500' : 'bg-amber-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-900 border border-white/5">
                      {service.thumbnail ? (
                        <img
                          src={getImageUrl(service.thumbnail)}
                          alt={service.service_name}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase text-slate-500">No Image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isApproved ? 'text-indigo-400 bg-indigo-400/10' : 'text-amber-400 bg-amber-400/10'} px-2 py-0.5 rounded flex items-center gap-1`}>
                          {isApproved ? <><FiCheckCircle /> Approved</> : <><FiClock /> Pending</>}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                          {service.categories?.[0] || 'Service'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                        {service.service_name}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-medium mb-2 truncate max-w-md">{service.description}</p>
                      <div className="flex items-center gap-4">
                        <p className="text-base font-black text-white">
                          {formatCurrency(service.service_charge)}
                        </p>
                        <div className="h-3 w-px bg-white/10" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Highlights: {service.points?.length || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 pr-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {service.availability ? 'Available' : 'Disabled'}
                      </p>
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
