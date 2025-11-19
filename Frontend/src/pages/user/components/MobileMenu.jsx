import PropTypes from 'prop-types'
import { useEffect } from 'react'

function MobileMenu({ open, onClose, quickLinks, categories }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        className="absolute right-0 top-0 h-full w-72 max-w-sm bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-semibold text-lg text-[#131921]">Hello, BBHC Member</span>
          <button onClick={onClose} className="text-2xl text-gray-600 hover:text-gray-800" aria-label="Close navigation">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b">
            <p className="text-xs uppercase text-gray-500 mb-2">Quick links</p>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-sm font-medium text-slate-800 hover:bg-amber-50 transition"
                >
                  <span className="text-lg">{link.icon}</span>
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-b">
            <p className="text-xs uppercase text-gray-500 mb-2">Browse BBHCBazaar</p>
            <div className="space-y-3">
              {['Home', 'Deals', 'Fresh Finds', 'Mobiles', 'Electronics', 'Fashion', 'BBHC Pay'].map((item) => (
                <button key={item} className="w-full text-left font-medium text-gray-800 hover:text-amber-600">
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs uppercase text-gray-500 mb-2">Shop by category</p>
            <div className="grid grid-cols-2 gap-3">
              {categories.slice(0, 6).map((category) => (
                <button key={category.label} className="flex flex-col items-start text-sm font-medium text-slate-800">
                  <span className="text-xl">•</span> {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button className="flex-1 py-2 rounded-full border border-[#131921] text-[#131921] font-semibold">Sign in</button>
          <button className="flex-1 py-2 rounded-full bg-[#131921] text-white font-semibold">Orders</button>
        </div>
      </div>
    </div>
  )
}

MobileMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  quickLinks: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired
    })
  ).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      image: PropTypes.string
    })
  ).isRequired
}

export default MobileMenu


