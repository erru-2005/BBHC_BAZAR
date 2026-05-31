import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getServiceById, getProductRatingStats } from '../../services/api'
import { getImageUrl } from '../../utils/image'
import { FiArrowLeft, FiCheckCircle, FiChevronRight, FiChevronLeft } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import RatingBadge from '../../components/RatingBadge'
import DetailSkeleton from './components/DetailSkeleton'
import Portal from '../../components/Portal'

function ServiceDetail() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [service, setService] = useState(location.state?.service || null)
  const [loading, setLoading] = useState(!location.state?.service)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [ratingStats, setRatingStats] = useState(null)
  const { home } = useSelector((state) => state.data)

  // Combine thumbnail and gallery into a single list
  const allImages = service ? [
    service.thumbnail,
    ...(service.gallery || [])
  ].filter(Boolean) : []

  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true)
        const data = await getServiceById(serviceId)
        // Ensure strictly DB-driven content
        if (data) {
          setService(data)
          
          // Load product rating stats
          const stats = await getProductRatingStats(serviceId)
          setRatingStats(stats)
          
        } else {
          setService(null)
        }
      } catch (err) {
        console.error(err)
        setService(null)
      } finally {
        setLoading(false)
      }
    }
    
    if (!service || !ratingStats) {
      loadService()
    }
    window.scrollTo(0, 0)
  }, [serviceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbff]">
        <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
          <MobileSearchBar />
        </MainHeader>
        <DetailSkeleton />
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
  const hasHighlights = Array.isArray(service.points) && service.points.length > 0

  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % allImages.length)
  const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12 pb-24 lg:pb-12">
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
            <div className="relative group">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-[16/10] rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-100 border border-white bg-slate-50"
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeImageIndex}
                    src={getImageUrl(allImages[activeImageIndex])} 
                    alt={service.service_name} 
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
                
                {service.categories?.[0] && (
                  <div className="absolute top-6 left-6 flex gap-2 z-10">
                    <span className="px-5 py-2 bg-white/90 backdrop-blur-xl rounded-full text-xs font-black uppercase tracking-widest text-indigo-600 shadow-xl border border-white">
                      {service.categories[0]}
                    </span>
                  </div>
                )}

                {/* Slider Controls - Only if multiple images */}
                {allImages.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                    >
                      <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                    >
                      <FiChevronRight className="w-6 h-6" />
                    </button>

                    {/* Image Counter Badge */}
                    <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
                      {activeImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            {/* Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActiveImageIndex(i)}
                    className={`flex-shrink-0 w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === i ? 'border-indigo-600 scale-105 shadow-lg' : 'border-white shadow-sm hover:border-indigo-200'
                    }`}
                  >
                    <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`Thumbnail ${i}`} />
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
                  {ratingStats && ratingStats.total_ratings > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <RatingBadge 
                        value={Number(ratingStats.average_rating)} 
                        displayValue={Number(ratingStats.average_rating).toFixed(1)}
                        size="sm"
                      />
                      <span className="text-[10px] font-black text-slate-400">({ratingStats.total_ratings} Reviews)</span>
                    </div>
                  )}

                  <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-4">
                    {service.service_name}
                  </h1>

                  <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Pricing</span>
                    <p className="text-4xl font-black text-indigo-600">
                      ₹{Number(displayPrice).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Highlights */}
                  {hasHighlights && (
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
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-4">
                    <button 
                      onClick={() => navigate(`/service/${service.id || service._id}/book`, { state: { product: service } })}
                      className="w-full h-18 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      Book Now <FiChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>


            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav items={home?.bottomNavItems} />
    </div>
  )
}

export default ServiceDetail
