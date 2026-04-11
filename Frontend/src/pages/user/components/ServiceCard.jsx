import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../../../utils/image'
import { FiArrowRight, FiShield } from 'react-icons/fi'

function ServiceCard({ service }) {
  const navigate = useNavigate()
  const { id, _id, service_name, thumbnail, total_service_charge, service_charge, categories } = service
  const serviceId = id || _id
  
  const displayPrice = total_service_charge || service_charge
  const category = categories?.[0] || 'General'

  return (
    <div 
      onClick={() => navigate(`/service/${serviceId}`, { state: { service } })}
      className="group relative bg-white rounded-3xl border border-slate-100 p-3 h-full flex flex-col transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-1 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] w-full mb-4 overflow-hidden rounded-2xl bg-slate-50">
        <img 
          src={getImageUrl(thumbnail)} 
          alt={service_name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute top-2 left-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-slate-800 rounded-full shadow-sm border border-white/50">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm md:text-base font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
            {service_name}
          </h3>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Starting from</p>
            <p className="text-lg font-black text-slate-900 leading-none">
              ₹{Number(displayPrice).toLocaleString('en-IN')}
            </p>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <FiArrowRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Verification Badge (Subtle) */}
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-indigo-600 text-white p-2 rounded-full shadow-lg">
          <FiShield className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

ServiceCard.propTypes = {
  service: PropTypes.object.isRequired
}

export default ServiceCard
