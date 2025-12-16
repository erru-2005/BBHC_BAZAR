import { useEffect, useState, forwardRef } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCategories, getBag } from '../../../services/api'
import { FaUser, FaMagnifyingGlass, FaLocationDot, FaBagShopping, FaMobileScreenButton } from 'react-icons/fa6'
import SearchOverlay from './SearchOverlay'

const MainHeader = forwardRef(function MainHeader({ onOpenMenu, children }, logoRef) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [bagCount, setBagCount] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchPrefill, setSearchPrefill] = useState('')
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const fetchedCategories = await getCategories()
        setCategories(fetchedCategories || [])
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Fetch bag count for mobile header badge
  useEffect(() => {
    const fetchBagCount = async () => {
      if (isAuthenticated && userType === 'user') {
        try {
          const bagItems = await getBag()
          const count = Array.isArray(bagItems) ? bagItems.length : 0
          setBagCount(count)
        } catch (error) {
          // Silently fail - bag might not be accessible
          setBagCount(0)
        }
      } else {
        setBagCount(0)
      }
    }

    fetchBagCount()
  }, [isAuthenticated, userType])

  // Open search overlay when coming from other pages with state flag
  useEffect(() => {
    if (location.state?.openSearch) {
      setSearchPrefill(location.state?.searchQuery || '')
      setIsSearchOpen(true)
      const { openSearch, ...rest } = location.state || {}
      navigate(location.pathname + location.search, { replace: true, state: rest })
    }
  }, [location.state?.openSearch, location.state?.searchQuery, navigate, location.pathname, location.search])

  return (
    <header className="bg-[#131921] text-white shadow-lg w-full">
      <div className="w-full px-4 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3">
            <div 
              ref={logoRef}
              className="bg-white text-[#131921] font-black tracking-tight text-xl px-3 py-1 rounded-sm shadow"
            >
              BBHC<span className="text-pink-500">Bazaar</span>
            </div>
          </div>

          <div className="flex-1 hidden md:flex justify-center">
            <div 
              onClick={() => setIsSearchOpen(true)}
              className="w-full max-w-md flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-inner cursor-pointer"
            >
              <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search BBHCBazaar"
                readOnly
                className="flex-1 bg-transparent px-1 py-1 text-sm text-gray-800 placeholder-gray-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Desktop Header Actions */}
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            <button
              onClick={() => {
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
              }}
              className="flex items-center gap-2 hover:text-amber-300 transition"
            >
              <FaBagShopping className="w-5 h-5" />
              <span className="text-white">Bag</span>
            </button>
            <button 
              onClick={() => {
                if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
                  navigate('/user/phone-entry')
                } else {
                  navigate('/user/profile')
                }
              }}
              className="flex items-center gap-2 hover:text-amber-300 transition"
            >
              {isAuthenticated && user && userType !== 'seller' && userType !== 'master' ? (
                <>
                  <span className="text-white">{user.first_name || user.username || 'User'}</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white">
                    <FaUser className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-white">SIGN IN</span>
                  <span className="text-white">{'>'}</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white">
                    <FaUser className="w-4 h-4" />
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Mobile Header Actions */}
          <div className="flex md:hidden items-center gap-3 text-sm font-medium">
            {/* Mobile App Download Icon */}
            <button
              onClick={() => {
                // Handle mobile app download - you can add your app store links here
                // For now, it's a placeholder
                alert('Mobile app download coming soon!')
              }}
              className="flex items-center justify-center hover:text-amber-300 transition"
              aria-label="Download mobile app"
            >
              <FaMobileScreenButton className="w-5 h-5" />
            </button>

            {/* Bag Icon with Badge */}
            <button
              onClick={() => {
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
              }}
              className="relative flex items-center justify-center hover:text-amber-300 transition"
              aria-label="Shopping bag"
            >
              <FaBagShopping className="w-5 h-5" />
              {bagCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {bagCount > 99 ? '99+' : bagCount}
                </span>
              )}
            </button>

            {/* User Profile - Show "You" instead of name */}
            <button 
              onClick={() => {
                if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
                  navigate('/user/phone-entry')
                } else {
                  navigate('/user/profile')
                }
              }}
              className="flex items-center gap-2 hover:text-amber-300 transition"
            >
              {isAuthenticated && user && userType !== 'seller' && userType !== 'master' ? (
                <>
                  <span className="text-white">You</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white">
                    <FaUser className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-white">Login</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white">
                    <FaUser className="w-4 h-4" />
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-200 py-2 overflow-x-auto scrollbar-hide">
            <button 
              className="hover:text-white flex items-center flex-shrink-0" 
              onClick={onOpenMenu} 
              aria-label="Open navigation menu"
            >
              <span className="text-xl">☰</span>
            </button>
            {loading ? (
              <span className="text-gray-400 flex-shrink-0">Loading categories...</span>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <button 
                  key={category.id || category._id} 
                  className="hover:text-white whitespace-nowrap flex-shrink-0"
                  onClick={() =>
                    navigate(`/category/${category.id || category._id || encodeURIComponent(category.name)}`, {
                      state: { categoryName: category.name }
                    })
                  }
                >
                  {category.name}
                </button>
              ))
            ) : (
              <span className="text-gray-400 flex-shrink-0">No categories available</span>
            )}
          </div>
          <div className="hidden md:flex items-center text-sm text-gray-200 pb-2">
            <button 
              className="hover:text-white flex items-center flex-shrink-0 pointer-events-none"
              aria-hidden="true"
              tabIndex={-1}
            >
              <span className="text-xl opacity-0">☰</span>
            </button>
            <a 
              href="https://maps.app.goo.gl/VxcqFH7aferTNzPx8" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition whitespace-nowrap overflow-x-auto"
            >
              <FaLocationDot className="text-pink-500 w-4 h-4 flex-shrink-0" />
              <span className="text-xs text-gray-300 font-normal">Delivering to</span>
              <span className="text-xs text-gray-200 font-medium">BBHCBazaar Outlet, Kundapura 576201</span>
            </a>
          </div>
        </div>

        {children}
      </div>
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        initialQuery={searchPrefill}
      />
    </header>
  )
})

MainHeader.propTypes = {
  onOpenMenu: PropTypes.func.isRequired,
  children: PropTypes.node
}

MainHeader.displayName = 'MainHeader'

export default MainHeader


