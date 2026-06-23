import { useEffect, useState, forwardRef } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { getBag } from '../../../services/api'
import { FaMagnifyingGlass, FaMapLocationDot, FaBagShopping, FaMobileScreenButton } from 'react-icons/fa6'
import SearchOverlay from './SearchOverlay'
import SparklesText from '../../../components/SparklesText'

const mapSparkleColors = { first: '#67e8f9', second: '#fda4af' }

const MAP_URL = 'https://maps.app.goo.gl/VxcqFH7aferTNzPx8'

const headerHover = 'transition-colors duration-200 hover:text-white'
const headerNavLink = `text-white ${headerHover}`
const headerCategoryLink = `text-gray-400 ${headerHover}`
const headerDesktopAction =
  `inline-flex items-center gap-2 text-base font-medium leading-none ${headerNavLink}`
const headerMobileIconBtn =
  `inline-flex items-center justify-center p-1.5 ${headerNavLink}`
const headerMobileIcon = 'w-6 h-6 flex-shrink-0'
const headerDesktopIcon = 'w-4 h-4 flex-shrink-0'
const headerDesktopMapIcon = 'w-5 h-5 flex-shrink-0'

function CategoryNavRow({ onOpenMenu, loading, categories, navigate, className = '' }) {
  return (
    <div className={`flex items-stretch border-t border-white/10 ${className}`}>
      <div className="flex-shrink-0 flex items-center px-3 sm:px-4 border-r border-white/10 bg-white/[0.04]">
        <button
          type="button"
          className={`${headerCategoryLink} flex h-10 w-10 items-center justify-center rounded-lg`}
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-5 sm:gap-6 px-3 sm:px-4 py-2.5 text-sm">
          {loading ? (
            <span className="text-gray-500 flex-shrink-0 whitespace-nowrap">Loading categories...</span>
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <button
                key={category.id || category._id}
                type="button"
                className={`${headerCategoryLink} whitespace-nowrap flex-shrink-0 font-medium tracking-wide`}
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
            <span className="text-gray-500 flex-shrink-0 whitespace-nowrap">No categories available</span>
          )}
        </div>
      </div>
    </div>
  )
}

CategoryNavRow.propTypes = {
  onOpenMenu: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  categories: PropTypes.array.isRequired,
  navigate: PropTypes.func.isRequired,
  className: PropTypes.string
}

const MainHeader = forwardRef(function MainHeader({ onOpenMenu, children }, logoRef) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchPrefill, setSearchPrefill] = useState('')
  const { categories, loading: globalLoading } = useSelector((state) => state.data.home)
  const [loading, setLoading] = useState(true)
  const [bagCount, setBagCount] = useState(0)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (categories?.length > 0) {
      setLoading(false)
    } else {
      setLoading(globalLoading)
    }
  }, [categories?.length, globalLoading])

  useEffect(() => {
    const fetchBagCount = async () => {
      if (isAuthenticated && userType === 'user') {
        try {
          const bagItems = await getBag()
          const count = Array.isArray(bagItems) ? bagItems.length : 0
          setBagCount(count)
        } catch {
          setBagCount(0)
        }
      } else {
        setBagCount(0)
      }
    }

    fetchBagCount()
  }, [isAuthenticated, userType])

  useEffect(() => {
    if (location.state?.openSearch) {
      setSearchPrefill(location.state?.searchQuery || '')
      setIsSearchOpen(true)
      const { openSearch, ...rest } = location.state || {}
      navigate(location.pathname + location.search, { replace: true, state: rest })
    }
  }, [location.state?.openSearch, location.state?.searchQuery, navigate, location.pathname, location.search])

  const categoryNavProps = {
    onOpenMenu,
    loading,
    categories: categories || [],
    navigate
  }

  return (
    <header className="bg-[#131921] text-white shadow-lg w-full sticky top-0 z-50">
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
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full max-w-md flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-inner cursor-text text-left"
              aria-label="Open search"
            >
              <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <span className="flex-1 px-1 py-1 text-sm text-gray-500 select-none">
                Search BBHCBazaar
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-5">
            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={headerDesktopAction}
              aria-label="Open outlet map"
            >
              <span>MAP</span>
              <SparklesText
                sparklesCount={4}
                sparkleSize={11}
                edgeOnly
                colors={mapSparkleColors}
              >
                <FaMapLocationDot className={headerDesktopMapIcon} />
              </SparklesText>
            </a>
            <button
              onClick={() => alert('Mobile app download coming soon!')}
              className={headerDesktopAction}
              aria-label="Download mobile app"
            >
              <span>APP</span>
              <FaMobileScreenButton className={headerDesktopIcon} />
            </button>
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
              className={`relative ${headerDesktopAction}`}
            >
              <span>BAG</span>
              <FaBagShopping className={headerDesktopIcon} />
              {bagCount > 0 && (
                <span className="absolute -top-1.5 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center">
                  {bagCount > 99 ? '99+' : bagCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={headerMobileIconBtn}
              aria-label="Open outlet map"
            >
              <SparklesText sparklesCount={3} sparkleSize={15} edgeOnly colors={mapSparkleColors}>
                <FaMapLocationDot className={headerMobileIcon} />
              </SparklesText>
            </a>
            <button
              onClick={() => alert('Mobile app download coming soon!')}
              className={headerMobileIconBtn}
              aria-label="Download mobile app"
            >
              <FaMobileScreenButton className={headerMobileIcon} />
            </button>
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
              className={`relative ${headerMobileIconBtn}`}
              aria-label="Shopping bag"
            >
              <FaBagShopping className={headerMobileIcon} />
              {bagCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center translate-x-1/4 -translate-y-1/4">
                  {bagCount > 99 ? '99+' : bagCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="hidden md:block -mx-4 lg:-mx-8">
          <CategoryNavRow {...categoryNavProps} />
        </div>

        {children}

        <div className="md:hidden -mx-4">
          <CategoryNavRow {...categoryNavProps} className="mt-1" />
        </div>
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
