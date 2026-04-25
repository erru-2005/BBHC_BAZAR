import { useLocation } from 'react-router-dom'
import { FaInstagram, FaXTwitter, FaWhatsapp, FaLinkedinIn } from 'react-icons/fa6'

function SiteFooter() {
  const location = useLocation()
  const path = location.pathname

  // Show footer only on home page ('/') and product detail pages ('/product/...')
  const showFooter = path === '/' || path.startsWith('/product/')

  if (!showFooter) return null

  return (
    <footer className="mt-12 bg-[#131921] text-gray-200 py-10 w-full relative overflow-hidden">
      <div className="relative w-full px-4 lg:px-8">
        {/* Desktop Watermark - Confined to the top section only */}
        <div className="hidden md:flex absolute inset-0 pointer-events-none select-none z-0 items-center justify-center">
          <span className="text-[15vw] font-black uppercase tracking-tighter whitespace-nowrap text-white/[0.03] leading-none">
            BBHC BAZAR
          </span>
        </div>

        <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-white mb-4 text-base">Get to know BBHCBazaar</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">About BBHC</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Community creators</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Press & stories</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-base">Make money with us</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Sell with BBHC</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Creator marketplace</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Collaborations & bulk</li>
              <li className="text-gray-500 italic">become a seller</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-base">Customer support</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Your account</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Returns centre</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors duration-200">Privacy & policies</li>
            </ul>
          </div>
        </div>
      </div>


      <div className="relative z-10 w-full px-4 lg:px-8 border-t border-white/5 mt-20 pt-8 pb-32 md:pb-10">
        {/* Mobile Watermark - Centered in lower section */}
        <div className="md:hidden absolute inset-0 flex items-start justify-center pt-8 pointer-events-none select-none z-0 overflow-hidden">
          <span className="text-[17vw] font-black uppercase tracking-[-0.08em] whitespace-nowrap text-white/[0.03] leading-none">
            BBHC BAZAR
          </span>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
          <div className="hidden md:flex flex-col gap-2 items-center md:items-start text-center md:text-left">
            <p className="text-xs text-gray-500 font-medium tracking-wide">
              © {new Date().getFullYear()} BBHCBAZAR. <span className="opacity-50">PART OF BBHC ECOSYSTEM.</span>
            </p>
            <div className="flex gap-6 text-[10px] uppercase tracking-widest text-gray-600 font-bold">
              <span className="hover:text-gray-400 cursor-pointer transition-colors transition-duration-300">Terms</span>
              <span className="hover:text-gray-400 cursor-pointer transition-colors transition-duration-300">Privacy</span>
              <span className="hover:text-gray-400 cursor-pointer transition-colors transition-duration-300">Cookies</span>
            </div>
          </div>

          {/* Social Media Icons - Primary focus on mobile bottom */}
          <div className="flex gap-6 w-full md:w-auto justify-center md:justify-end">
            <a href="#" className="w-12 h-12 border border-green-500/50 md:border-white/10 flex items-center justify-center group hover:border-green-500 transition-all duration-300" aria-label="WhatsApp">
              <FaWhatsapp className="text-green-500 md:text-white/20 group-hover:text-green-500 transition-all duration-300" size={24} />
            </a>
            <a href="#" className="w-12 h-12 border border-blue-500/50 md:border-white/10 flex items-center justify-center group hover:border-blue-500 transition-all duration-300" aria-label="LinkedIn">
              <FaLinkedinIn className="text-blue-500 md:text-white/20 group-hover:text-blue-500 transition-all duration-300" size={24} />
            </a>
            <a href="#" className="w-12 h-12 border border-white/50 md:border-white/10 flex items-center justify-center group hover:border-white transition-all duration-300" aria-label="Twitter">
              <FaXTwitter className="text-white md:text-white/20 group-hover:text-white transition-all duration-300" size={22} />
            </a>
            <a href="#" className="w-12 h-12 border border-[#E4405F]/50 md:border-white/10 flex items-center justify-center group hover:border-[#E4405F] transition-all duration-300" aria-label="Instagram">
              <FaInstagram className="text-[#E4405F] md:text-white/20 group-hover:text-[#E4405F] transition-all duration-300" size={24} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter


