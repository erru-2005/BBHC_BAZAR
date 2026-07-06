import { useLocation } from 'react-router-dom'
import { FaInstagram, FaXTwitter, FaWhatsapp, FaLinkedinIn } from 'react-icons/fa6'

function SiteFooter() {
  const location = useLocation()
  const path = location.pathname

  // Show footer only on home page ('/') and product detail pages ('/product/...')
  const showFooter = path === '/' || path.startsWith('/product/')

  if (!showFooter) return null

  return (
    <footer className="mt-8 bg-[#131921] text-gray-400 pt-6 pb-24 sm:pb-6 w-full border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Left Side: Copyright & Ecosystem */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <p className="text-gray-500 font-medium">
            © {new Date().getFullYear()} BBHCBAZAR. <span className="opacity-75">PART OF BBHC ECOSYSTEM.</span>
          </p>
          <div className="flex gap-4 uppercase tracking-wider text-[10px] text-gray-500 font-bold">
            <a href="#" className="hover:text-amber-400 transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-amber-400 transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-amber-400 transition-colors duration-200">Cookies</a>
          </div>
        </div>

        {/* Right Side: Social Media Links */}
        <div className="flex gap-4">
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-green-500 hover:text-green-500 transition-all duration-300" aria-label="WhatsApp">
            <FaWhatsapp size={16} />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all duration-300" aria-label="LinkedIn">
            <FaLinkedinIn size={16} />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-white hover:text-white transition-all duration-300" aria-label="Twitter">
            <FaXTwitter size={14} />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-[#E4405F] hover:text-[#E4405F] transition-all duration-300" aria-label="Instagram">
            <FaInstagram size={16} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter


