import { useEffect, useState, useRef } from 'react'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import ServiceCard from './components/ServiceCard'
import { getServices } from '../../services/api'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiSliders, FiMenu } from 'react-icons/fi'

function Services({ headerLogoRef: externalHeaderLogoRef }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef
  const { home } = useSelector((state) => state.data)
  
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true)
        const data = await getServices()
        setServices(data)
      } catch (err) {
        console.error('Failed to load services', err)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  const filteredServices = services.filter(s => 
    s.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.categories?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-none">Explore Services</h1>
            <p className="text-slate-500 font-bold max-w-lg leading-relaxed">
              Find expert professionals for home repairs, events, wellness, and more. 
              BBHCBazaar verified quality at your doorstep.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 lg:w-80 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center px-4 transition-all focus-within:shadow-indigo-100 focus-within:border-indigo-200">
              <FiSearch className="text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search services..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-full bg-transparent px-3 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300 placeholder:font-bold" 
              />
            </div>
            <button className="h-14 w-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-100">
              <FiSliders className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-slate-100 h-64 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredServices.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredServices.map(service => (
                <motion.div 
                  key={service.id || service._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="py-32 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
              <FiSearch className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Oops! No services found</h3>
            <p className="text-slate-500 font-bold max-w-sm">
              {searchTerm 
                ? `We couldn't find any services matching "${searchTerm}". Try a different term or clear filters.`
                : "Well, this is quiet. We'll start listing expert services here very soon!"}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-8 text-indigo-600 font-bold text-sm bg-indigo-50 px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-colors"
              >
                Show all services
              </button>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems} />
    </div>
  )
}

export default Services


