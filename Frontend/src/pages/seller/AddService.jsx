import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft } from 'react-icons/fi'
import ServiceForm from './components/ServiceForm'

function SellerAddService() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 px-4 sm:px-6">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/seller/services')}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100"
            >
              <FiArrowLeft className="h-6 w-6" />
            </motion.button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase">Service</span>
                 <span className="text-xl font-black text-blue-600 tracking-tight font-outfit uppercase">Provision</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Professional Offering Protocol</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl pt-32 space-y-10">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-outfit">Initialize Service</h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-[0.2em] opacity-80">
             Frame your professional expertise for the marketplace.
          </p>
        </motion.div>
        
        <div className="bg-white rounded-[3rem] p-2 border border-slate-100 shadow-xl overflow-hidden mb-20">
          <ServiceForm />
        </div>
      </div>
    </div>
  )
}

export default SellerAddService
