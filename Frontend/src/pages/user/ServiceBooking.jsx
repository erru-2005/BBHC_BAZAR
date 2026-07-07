import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import MobileBottomNav from './components/MobileBottomNav'
import { getServiceById, createOrder } from '../../services/api'
import { getImageUrl } from '../../utils/image'
import { FiArrowLeft, FiCalendar, FiClock, FiCheckCircle, FiChevronRight, FiAlertCircle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import OrderSuccessDialog from '../../components/OrderSuccessDialog'

function ServiceBooking() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, userType } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)

  const [service, setService] = useState(location.state?.product || null)
  const [loading, setLoading] = useState(!service)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const [bookingType, setBookingType] = useState('single')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState(null)

  const requiresBookingDate = service?.requires_booking_date === true

  const deliveryCharge = useMemo(() => Number(service?.delivery_charge || 0), [service])
  const totalValuation = useMemo(() => Number(service?.total_service_charge || service?.service_charge || 0) + deliveryCharge, [service, deliveryCharge])

  useEffect(() => {
    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/phone-entry', {
        state: { returnTo: `/service/${serviceId}/book` }
      })
    }
  }, [isAuthenticated, userType, navigate, serviceId])

  useEffect(() => {
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
    if (!service) loadService()
    window.scrollTo(0, 0)
  }, [serviceId, service])

  const isValid = useMemo(() => {
    if (!requiresBookingDate) return true
    if (!startDate) return false
    if (bookingType === 'range' && !endDate) return false
    return true
  }, [requiresBookingDate, startDate, endDate, bookingType])

  const scheduleLabel = useMemo(() => {
    if (!requiresBookingDate) return 'Flexible — professional will coordinate'
    if (bookingType === 'single' && startDate) {
      return new Date(startDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    if (bookingType === 'range' && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return null
  }, [requiresBookingDate, bookingType, startDate, endDate])

  const handleFinalConfirm = async () => {
    if (!isValid) {
      setError('Please select a booking date to continue.')
      return
    }
    if (userType !== 'user') {
      navigate('/user/phone-entry', {
        state: { returnTo: `/service/${serviceId}/book` }
      })
      return
    }
    if (requiresBookingDate && !startDate) {
      setError('Booking date is required for this service.')
      return
    }
    if (requiresBookingDate && bookingType === 'range' && !endDate) {
      setError('Booking end date is required for this service.')
      return
    }

    setBookingLoading(true)
    setError(null)

    try {
      const bookingData = {
        service_id: service.id || service._id,
        type: requiresBookingDate ? bookingType : 'flexible',
        startDate: requiresBookingDate ? startDate : null,
        endDate: requiresBookingDate && bookingType === 'range' ? endDate : null,
        flexible: !requiresBookingDate,
      }

      const payload = {
        product_id: service.id || service._id,
        quantity: 1,
        booking: bookingData,
        platform: 'web',
        device: navigator.userAgent
      }

      const order = await createOrder(payload)
      setSuccessOrder(order)
      setShowSuccess(true)
    } catch (err) {
      console.error('Booking failed:', err)
      const errorMsg = err.response?.data?.error || err.message || "Failed to confirm booking"
      const trace = err.response?.data?.traceback ? `\n\nDEBUG INFO:\n${err.response.data.traceback}` : ''
      setError(errorMsg + trace)
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!service) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <FiAlertCircle className="w-12 h-12 text-rose-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-800">Service Unavailable</h2>
      <p className="text-slate-500 mt-2 mb-6">We couldn't retrieve the details for this service.</p>
      <button onClick={() => navigate('/services')} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg">
        Back to Services
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 lg:py-16 pb-24">
        {/* Navigation / Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all hover:shadow-md"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Configure Booking</h1>
            <p className="text-xs font-semibold text-slate-400">
              Confirm your booking details and timing
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200/80">
              {requiresBookingDate ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FiCalendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Timing Preference</h3>
                      <p className="text-xs font-semibold text-slate-400">Select when you need this service</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-50 p-1.5 rounded-lg border border-slate-200/50">
                    <button 
                      type="button"
                      onClick={() => setBookingType('single')}
                      className={`py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        bookingType === 'single' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Specific Day
                    </button>
                    <button 
                      type="button"
                      onClick={() => setBookingType('range')}
                      className={`py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        bookingType === 'range' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        {bookingType === 'single' ? 'Pick a Date *' : 'Delivery Starts *'}
                      </label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                          className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all text-sm"
                        />
                        <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                      </div>
                    </div>

                    <AnimatePresence>
                      {bookingType === 'range' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Delivery Ends *</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate || new Date().toISOString().split('T')[0]}
                              required
                              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all text-sm"
                            />
                            <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">Flexible Booking</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    No date selection is required. The professional will contact you to coordinate a convenient timing.
                  </p>
                </div>
              )}

              {!requiresBookingDate && (
                <div className="mt-6 p-4 bg-blue-50/60 rounded-lg border border-blue-100 flex gap-3">
                  <FiClock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-blue-700/90 leading-relaxed uppercase tracking-tight">
                    The seller will coordinate timing with you after accepting your request.
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-amber-50/60 rounded-lg border border-amber-100 flex gap-3">
                <FiAlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                  By confirming, you agree to our service terms. Our professional will contact you shortly after acceptance.
                </p>
              </div>
            </div>
          </div>

          {/* Summary Side */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20 space-y-6">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Order Summary</h3>
                
                <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200/40">
                  <img 
                    src={getImageUrl(service.thumbnail)} 
                    alt={service.service_name} 
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate tracking-tight">{service.service_name}</h4>
                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{service.categories?.[0] || 'Professional Service'}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Base Charge</span>
                    <span className="font-bold text-sm text-slate-900">₹{Number(service.total_service_charge || service.service_charge).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Delivery Fee</span>
                    <span className="font-bold text-sm text-slate-900">
                      {deliveryCharge === 0 ? (
                        <span className="text-green-600 font-bold">FREE</span>
                      ) : (
                        `₹${deliveryCharge.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Total Valuation</span>
                    <span className="text-lg font-black text-indigo-600">₹{totalValuation.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-rose-600 flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  disabled={!isValid || bookingLoading}
                  onClick={handleFinalConfirm}
                  className="w-full h-11 text-xs font-bold tracking-wider text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {bookingLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      CONFIRM & BOOK NOW
                      <FiChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Secure Booking Transmission
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav items={home?.bottomNavItems} />

      <OrderSuccessDialog
        open={showSuccess && !!successOrder}
        isService
        productName={service.service_name}
        amount={totalValuation}
        orderNumber={successOrder?.orderNumber || successOrder?.id}
        status={successOrder?.status}
        scheduleLabel={scheduleLabel}
        onViewOrders={() => navigate('/user/orders')}
        onContinueShopping={() => navigate('/')}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default ServiceBooking
