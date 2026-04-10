import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getServiceById } from '../../services/api'
import { getImageUrl } from '../../utils/image'
import { FiArrowLeft, FiCheckCircle, FiShield, FiClock, FiStar, FiChevronRight } from 'react-icons/fi'
import { motion } from 'framer-motion'

function ServiceDetail() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [service, setService] = useState(location.state?.service || null)
  const [loading, setLoading] = useState(!location.state?.service)
  const { home } = useSelector((state) => state.data)

  useEffect(() => {
    if (!service) {
      const loadService = async () => {
        try {
          setLoading(true)
          const data = await getServiceById(serviceId)
          setService(data)
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      loadService()
    }
    window.scrollTo(0, 0)
  }, [serviceId, service])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Service Not Found</h2>
        <p className="text-slate-500 mb-6">The service you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/services')} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl">
          Back to Services
        </button>
      </div>
    )
  }

  const displayPrice = service.total_service_charge || service.service_charge

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        {/* Breadcrumbs / Back button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-sm mb-8 transition-colors group"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Explore
        </button>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left Column: Visuals & Core Info */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-[16/10] rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-100 border border-white"
            >
              <img 
                src={getImageUrl(service.thumbnail)} 
                alt={service.service_name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="px-5 py-2 bg-white/90 backdrop-blur-xl rounded-full text-xs font-black uppercase tracking-widest text-indigo-600 shadow-xl border border-white">
                  {service.categories?.[0] || 'Premium Service'}
                </span>
              </div>
            </motion.div>

            {/* Gallery if exists */}
            {service.gallery && service.gallery.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {service.gallery.map((img, i) => (
                  <div key={i} className="aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">
                    <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                  </div>
                ))}
              </div>
            )}

            {/* About Section */}
            <div className="bg-white rounded-[40px] p-8 lg:p-10 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full" />
                Service Description
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                {service.description}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Quick Stats (Sticky on Desktop) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[40px] p-8 lg:p-10 shadow-xl shadow-indigo-100/50 border border-white relative overflow-hidden"
              >
                {/* Background Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex text-amber-400"><FiStar className="fill-current w-4 h-4" /><FiStar className="fill-current w-4 h-4" /><FiStar className="fill-current w-4 h-4" /><FiStar className="fill-current w-4 h-4" /><FiStar className="fill-current w-4 h-4" /></div>
                    <span className="text-xs font-black text-slate-400">5.0 (24 Reviews)</span>
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-4">
                    {service.service_name}
                  </h1>

                  <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Pricing</span>
                    <p className="text-4xl font-black text-indigo-600">
                      ₹{Number(displayPrice).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="space-y-4 mb-10">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <FiClock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</p>
                        <p className="text-sm font-bold text-slate-700">Usually takes 2-4 Hours</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-3xl border border-emerald-100/50">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <FiShield className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Service Check</p>
                        <p className="text-sm font-bold text-emerald-700">Verified Professional</p>
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mb-10">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Key Highlights</h3>
                    <div className="space-y-3">
                      {service.points?.map((point, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <FiCheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-600">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-4">
                    <button className="w-full h-18 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      Book Now <FiChevronRight className="w-6 h-6" />
                    </button>
                    <button className="w-full h-18 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-3xl hover:bg-slate-50 transition-colors">
                      Inquiry & Questions
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Seller Info */}
              <div className="bg-slate-900 rounded-[40px] p-8 text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Provided By</p>
                  <p className="text-lg font-black">{service.seller_name || 'Expert Partner'}</p>
                </div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center font-black text-xl">
                  { (service.seller_name || 'E')[0].toUpperCase() }
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems} />
    </div>
  )
}

export default ServiceDetail
