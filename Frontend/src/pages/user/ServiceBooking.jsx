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
import SuccessAnimation from '../../components/SuccessAnimation'

function ServiceBooking() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, userType } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)

  const [service, setService] = useState(location.state?.product || null)
  const [loading, setLoading] = useState(!service)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Booking state
  const [bookingType, setBookingType] = useState('single') // 'single' or 'range'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/user/phone-entry', {
        state: { returnTo: `/service/${serviceId}/book` }
      })
    }
  }, [isAuthenticated, navigate, serviceId])

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
    // Dates are now optional. If not selected, we assume "Flexible Timing"
    return true
  }, [])

  const handleProceed = () => {
    if (!isValid) return
    setStep(2)
    window.scrollTo(0, 0)
  }

  const handleFinalConfirm = async () => {
    if (userType !== 'user') {
      setError('Only customers can book services. Please login with a user account.')
      return
    }
    setBookingLoading(true)
    setError(null)

    try {
      const bookingData = {
        service_id: service.id || service._id,
        type: bookingType,
        startDate: startDate || null,
        endDate: (bookingType === 'range' && endDate) ? endDate : null,
        flexible: !startDate
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
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!service) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <FiAlertCircle className="w-16 h-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-slate-800">Service Unavailable</h2>
      <p className="text-slate-500 mt-2 mb-8">We couldn't retrieve the details for this service.</p>
      <button onClick={() => navigate('/services')} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl">
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

      <main className="max-w-4xl mx-auto px-4 py-8 lg:py-16 pb-32">
        {/* Progress Header */}
        <div className="flex items-center gap-4 mb-12">
          <button 
            onClick={() => step === 2 ? setStep(1) : navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all hover:shadow-md"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Configure Booking</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step {step} of 2: {step === 1 ? 'Schedule Details' : 'Final Confirmation'}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left: Configuration/Confirmation */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-[40px] p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-white"
                >
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FiCalendar className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Timing Preference</h3>
                      <p className="text-sm font-bold text-slate-400">When should we deliver the service?</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="grid grid-cols-2 gap-3 mb-10 bg-slate-50 p-2 rounded-3xl">
                    <button 
                      onClick={() => setBookingType('single')}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        bookingType === 'single' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Specific Day
                    </button>
                    <button 
                      onClick={() => setBookingType('range')}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        bookingType === 'range' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {/* Date Inputs */}
                  <div className="space-y-8">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 transition-colors group-focus-within:text-indigo-600">
                        {bookingType === 'single' ? 'Pick a Date' : 'Delivery Starts'}
                      </label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full h-18 bg-slate-50 border-2 border-transparent rounded-[2rem] px-8 font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all text-lg"
                        />
                        <FiCalendar className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 pointer-events-none" />
                      </div>
                    </div>

                    <AnimatePresence>
                      {bookingType === 'range' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="group overflow-hidden"
                        >
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 transition-colors group-focus-within:text-indigo-600">Delivery Ends</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate || new Date().toISOString().split('T')[0]}
                              className="w-full h-18 bg-slate-50 border-2 border-transparent rounded-[2rem] px-8 font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all text-lg"
                            />
                            <FiCalendar className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 pointer-events-none" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Info Note */}
                  <div className="mt-10 p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex gap-4">
                    <FiClock className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[11px] font-bold text-blue-600/80 leading-relaxed uppercase tracking-tight">
                      Pro-Tip: Choosing a range allows our professionals to find the most efficient window for your service.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[40px] p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-white"
                >
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <FiCheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Review Selection</h3>
                      <p className="text-sm font-bold text-slate-400">Please confirm your service details</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selected Schedule</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                          <FiCalendar className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900">
                            {bookingType === 'single' ? 'Specific Day' : 'Custom Range'}
                          </p>
                          <p className="text-sm font-bold text-indigo-600">
                            {!startDate ? (
                              'Flexible Timing (Professional will coordinate)'
                            ) : bookingType === 'single' ? (
                              new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            ) : (
                              `${new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Service Details</p>
                      <div className="flex items-center gap-4">
                        <img 
                          src={getImageUrl(service.thumbnail)} 
                          className="w-12 h-12 rounded-2xl object-cover"
                          alt=""
                        />
                        <div>
                          <p className="text-lg font-black text-slate-900">{service.service_name}</p>
                          <p className="text-sm font-bold text-slate-500">Professional quality service</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 p-6 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex gap-4">
                    <FiAlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-bold text-amber-700 leading-relaxed">
                      By confirming, you agree to our service terms. Our professional will contact you shortly after acceptance.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/50 border border-white relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Order Summary</h3>
                  
                  <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-3xl">
                    <img 
                      src={getImageUrl(service.thumbnail)} 
                      alt={service.service_name} 
                      className="w-16 h-16 rounded-2xl object-cover border border-white shadow-sm"
                    />
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 truncate tracking-tight">{service.service_name}</h4>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{service.categories?.[0] || 'Professional Service'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Charge</span>
                      <span className="font-black text-slate-900">₹{Number(service.total_service_charge || service.service_charge).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Valuation</span>
                      <span className="text-2xl font-black text-indigo-600">₹{Number(service.total_service_charge || service.service_charge).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4" /> {error}
                    </div>
                  )}

                  <button
                    disabled={!isValid || bookingLoading}
                    onClick={step === 1 ? handleProceed : handleFinalConfirm}
                    className={`w-full h-18 text-white font-black rounded-3xl shadow-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 ${
                      step === 1 ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                    } hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    {bookingLoading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {step === 1 ? 'PROCEED TO CONFIRM' : 'CONFIRM & BOOK NOW'} 
                        <FiChevronRight className="w-6 h-6" />
                      </>
                    )}
                  </button>

                  <p className="text-center mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
                    <FiCheckCircle className="w-4 h-4" /> Secure Booking Transmission
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav items={home?.bottomNavItems} />

      <AnimatePresence>
        {showSuccess && successOrder && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowSuccess(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-[clamp(320px,95vw,480px)] bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-50"
            >
              {/* Header Accent */}
              <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
              
              <div className="p-8 text-center">
                <SuccessAnimation />
                
                <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Request Sent!</h2>
                <p className="text-[13px] font-medium text-slate-500 mb-10 leading-relaxed px-4">
                  Your booking request was successfully transmitted. Our professional partner will review it and notify you shortly.
                </p>

                <div className="space-y-3 px-2">
                  <button 
                    onClick={() => navigate('/user/orders')}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
                  >
                    Manage My Requests
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Return Home
                  </button>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-50">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Ref: {successOrder.orderNumber || successOrder.id}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ServiceBooking
