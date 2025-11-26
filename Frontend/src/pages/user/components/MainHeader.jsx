import { useEffect, useState, forwardRef } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { getCategories } from '../../../services/api'
import { FaUser, FaMagnifyingGlass, FaLocationDot, FaBagShopping } from 'react-icons/fa6'

const MainHeader = forwardRef(function MainHeader({ onOpenMenu, children }, logoRef) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  const navigate = useNavigate()

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
            <div className="w-full max-w-md flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-inner">
              <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search BBHCBazaar"
                className="flex-1 bg-transparent px-1 py-1 text-sm text-gray-800 placeholder-gray-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <button className="hidden md:flex items-center gap-2 hover:text-amber-300 transition">
              <FaBagShopping className="w-5 h-5" />
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
    </header>
  )
})

MainHeader.propTypes = {
  onOpenMenu: PropTypes.func.isRequired,
  children: PropTypes.node
}

MainHeader.displayName = 'MainHeader'

export default MainHeader


