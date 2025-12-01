import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getCategories } from '../../../services/api'
import { FaStore, FaHandshake, FaBagShopping, FaUserLarge, FaHeart, FaRegCircle } from 'react-icons/fa6'

// Reuse the same icons from MobileBottomNav
const quickLinkIconMap = {
  profile: FaUserLarge, // Maps to "me" icon from bottom nav
  services: FaHandshake, // Maps to "service" icon from bottom nav
  products: FaStore, // Maps to "product" icon from bottom nav
  wishlist: FaHeart, // No direct match, using heart icon
  bag: FaBagShopping // Maps to "bag" icon from bottom nav
}

function MobileMenu({ open, onClose }) {
  const navigate = useNavigate()
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)
  const [apiCategories, setApiCategories] = useState([])
  
  const { mobileQuickLinks = [], quickCategories = [] } = home || {}

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

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories()
        setApiCategories(cats || [])
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        setApiCategories([])
      }
    }
    if (open) {
      fetchCategories()
    }
  }, [open])

  const handleQuickLinkClick = (link) => {
    onClose()
    if (link.label === 'Profile') {
      if (!isAuthenticated || userType !== 'user') {
        navigate('/user/phone-entry')
      } else {
        navigate('/user/profile')
      }
    } else if (link.label === 'Bag') {
      if (!isAuthenticated || userType !== 'user') {
        navigate('/user/phone-entry', {
          state: {
            returnTo: '/user/bag',
            message: 'Please login to view your bag.'
          }
        })
      } else {
        navigate('/user/bag')
      }
    } else if (link.label === 'Products') {
      navigate('/')
    } else if (link.label === 'Services') {
      navigate('/')
    } else if (link.label === 'Wishlist') {
      // Placeholder for wishlist
      navigate('/')
    }
  }

  const handleCategoryClick = (category) => {
    onClose()
    // Navigate to category page or home with category filter
    navigate('/')
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">
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
          <div>
            {isAuthenticated && user && userType === 'user' ? (
              <div>
                <span className="text-xs text-gray-500">Welcome,</span>
                <p className="font-semibold text-lg text-[#131921]">
                  {user.first_name || user.username || 'User'}
                </p>
              </div>
            ) : (
              <span className="font-semibold text-lg text-[#131921]">Hello, BBHC Member</span>
            )}
          </div>
          <button onClick={onClose} className="text-2xl text-gray-600 hover:text-gray-800" aria-label="Close navigation">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b">
            <p className="text-xs uppercase text-gray-500 mb-2">Quick links</p>
            <div className="grid grid-cols-2 gap-3">
              {mobileQuickLinks.map((link) => {
                const iconKey = typeof link.icon === 'string' ? link.icon.toLowerCase() : null
                const IconComponent = iconKey ? quickLinkIconMap[iconKey] : null
                return (
                  <button
                    key={link.label}
                    onClick={() => handleQuickLinkClick(link)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-sm font-medium text-slate-800 hover:bg-amber-50 transition"
                  >
                    <span className="text-lg text-amber-500">
                      {IconComponent ? (
                        <IconComponent className="w-5 h-5" />
                      ) : link.icon ? (
                        link.icon
                      ) : (
                        <FaRegCircle className="w-5 h-5 text-slate-400" />
                      )}
                    </span>
                    {link.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-4 py-3 border-b">
            <p className="text-xs uppercase text-gray-500 mb-2">Browse BBHCBazaar</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onClose()
                  navigate('/')
                }}
                className="w-full text-left font-medium text-gray-800 hover:text-amber-600 transition"
              >
                Home
              </button>
              {['Deals', 'Fresh Finds', 'Mobiles', 'Electronics', 'Fashion', 'BBHC Pay'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    onClose()
                    // Placeholder navigation - can be updated when these pages are created
                    navigate('/')
                  }}
                  className="w-full text-left font-medium text-gray-800 hover:text-amber-600 transition"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs uppercase text-gray-500 mb-2">Shop by category</p>
            <div className="space-y-2">
              {apiCategories && apiCategories.length > 0 ? (
                apiCategories.map((category) => (
                  <button
                    key={category.id || category._id || category.name}
                    onClick={() => handleCategoryClick(category)}
                    className="w-full text-left flex items-center gap-2 text-sm font-medium text-slate-800 hover:text-amber-600 transition py-1"
                  >
                    <span className="text-amber-500">•</span>
                    {category.name || category.label}
                  </button>
                ))
              ) : quickCategories && quickCategories.length > 0 ? (
                quickCategories.map((category) => (
                  <button
                    key={category.id || category._id || category.label}
                    onClick={() => handleCategoryClick(category)}
                    className="w-full text-left flex items-center gap-2 text-sm font-medium text-slate-800 hover:text-amber-600 transition py-1"
                  >
                    <span className="text-amber-500">•</span>
                    {category.name || category.label}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">No categories available</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          {!isAuthenticated || userType !== 'user' ? (
            <>
              <button
                onClick={() => {
                  onClose()
                  navigate('/user/phone-entry')
                }}
                className="flex-1 py-2 rounded-full border border-[#131921] text-[#131921] font-semibold hover:bg-[#131921] hover:text-white transition"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  onClose()
                  navigate('/user/phone-entry', {
                    state: {
                      returnTo: '/user/orders',
                      message: 'Please login to view your orders.'
                    }
                  })
                }}
                className="flex-1 py-2 rounded-full bg-[#131921] text-white font-semibold hover:bg-[#0d1117] transition"
              >
                Orders
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onClose()
                navigate('/user/orders')
              }}
              className="w-full py-2 rounded-full bg-[#131921] text-white font-semibold hover:bg-[#0d1117] transition"
            >
              Orders
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

MobileMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default MobileMenu


