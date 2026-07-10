import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import ProductMediaViewer from '../../components/ProductMediaViewer'
import { getServiceById, getProductRatingStats } from '../../services/api'
import { getImageUrl } from '../../utils/image'
import { FiArrowLeft, FiCheckCircle, FiChevronRight } from 'react-icons/fi'
import { motion } from 'framer-motion'
import RatingBadge from '../../components/RatingBadge'
import DetailSkeleton from './components/DetailSkeleton'
import PublicReviews from '../../components/PublicReviews'

function ServiceDetail() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [service, setService] = useState(location.state?.service || null)
  const [loading, setLoading] = useState(!location.state?.service)
  const [ratingStats, setRatingStats] = useState(null)
  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const { thumbnail, gallery } = useMemo(() => {
    if (!service) return { thumbnail: null, gallery: [] }

    const raw = [service.thumbnail, ...(service.gallery || [])].filter(Boolean)
    const seen = new Set()
    const unique = raw.filter((img) => {
      const url = getImageUrl(img)
      if (!url || seen.has(url)) return false
      seen.add(url)
      return true
    })

    return {
      thumbnail: unique[0] || null,
      gallery: unique.slice(1)
    }
  }, [service])

  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true)
        const data = await getServiceById(serviceId)
        if (data) {
          setService(data)
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <h2 className="text-xl font-black text-slate-800 mb-2">Service Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The service you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button onClick={() => navigate('/services')} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl">
          Back to Services
        </button>
      </div>
    )
  }

  const displayPrice = service.total_service_charge || service.service_charge
  const hasHighlights = Array.isArray(service.points) && service.points.length > 0

  const infoCard = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl lg:rounded-[32px] p-4 sm:p-5 lg:p-8 shadow-sm lg:shadow-xl lg:shadow-indigo-100/50 border border-slate-100 relative overflow-hidden"
    >
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="relative z-10">
        {ratingStats && ratingStats.total_ratings > 0 && (
          <div className="flex items-center gap-2 mb-2.5">
            <RatingBadge
              value={Number(ratingStats.average_rating)}
              displayValue={Number(ratingStats.average_rating).toFixed(1)}
              size="sm"
            />
            <span className="text-[10px] font-bold text-slate-400">({ratingStats.total_ratings} reviews)</span>
          </div>
        )}

        <h1 className="text-lg sm:text-xl lg:text-3xl font-black text-slate-900 leading-snug mb-3">
          {service.service_name}
        </h1>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing</span>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-600">
            ₹{Number(displayPrice).toLocaleString('en-IN')}
          </p>
        </div>

        {hasHighlights && (
          <div className="mb-4 lg:mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Key Highlights</h3>
            <div className="space-y-2">
              {service.points.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!isAuthenticated || userType !== 'user') {
              navigate('/user/phone-entry', {
                state: { returnTo: `/service/${service.id || service._id}/book` }
              })
            } else {
              navigate(`/service/${service.id || service._id}/book`, { state: { product: service } })
            }
          }}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm sm:text-base font-black rounded-xl lg:rounded-2xl shadow-lg shadow-indigo-200/60 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Book Now <FiChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )

  const descriptionCard = (
    <div className="bg-white rounded-2xl lg:rounded-[32px] p-4 sm:p-5 lg:p-8 shadow-sm border border-slate-100">
      <h2 className="text-base sm:text-lg lg:text-2xl font-black text-slate-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 sm:h-6 bg-indigo-600 rounded-full" />
        Service Description
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
        {service.description}
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 pb-20 lg:pb-12">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold text-xs sm:text-sm mb-3 sm:mb-5 transition-colors group"
        >
          <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Explore
        </button>

        <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
          {/* Gallery */}
          <section className="order-1 w-full min-w-0 lg:col-span-7">
            <div className="relative w-full">
              {service.categories?.[0] && (
                <div className="absolute top-3 left-3 z-20">
                  <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm border border-white/80">
                    {service.categories[0]}
                  </span>
                </div>
              )}
              <ProductMediaViewer
                thumbnail={thumbnail}
                gallery={gallery}
                productName={service.service_name}
              />
            </div>
          </section>

          {/* Pricing & booking — right after gallery on mobile */}
          <section className="order-2 w-full lg:col-span-5 lg:row-span-2 lg:sticky lg:top-20">
            {infoCard}
          </section>

          {/* Description — below info on mobile, under gallery on desktop */}
          <section className="order-3 w-full lg:col-span-7 space-y-4">
            {descriptionCard}
            {/* Customer Reviews */}
            <div className="bg-white rounded-2xl lg:rounded-[32px] p-4 sm:p-5 lg:p-8 shadow-sm border border-slate-100">
              <h2 className="text-base sm:text-lg lg:text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 sm:h-6 bg-indigo-600 rounded-full" />
                Customer Reviews
              </h2>
              <PublicReviews itemId={serviceId} label="Service" />
            </div>
          </section>
        </div>
      </main>

      <MobileBottomNav items={home?.bottomNavItems} />
    </div>
  )
}

export default ServiceDetail
