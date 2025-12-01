import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaStore, FaHandshake, FaHouse, FaBagShopping, FaUserLarge, FaRegCircle } from 'react-icons/fa6'

const iconMap = {
  product: FaStore,
  service: FaHandshake,
  home: FaHouse,
  bag: FaBagShopping,
  me: FaUserLarge
}

const defaultItems = [
  { label: 'Product', icon: 'product', path: '/' },
  { label: 'Service', icon: 'service', path: '/' },
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Bag', icon: 'bag', path: '/user/bag' },
  { label: 'Me', icon: 'me', path: '/user/profile' }
]

function MobileBottomNav({ items = defaultItems }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  
  if (!items?.length) return null

  // Determine active item based on current route
  // Only one icon can be active at a time
  const getActiveItem = () => {
    const currentPath = location.pathname
    
    // Priority order: check specific routes first
    // Me routes
    if (currentPath === '/user/profile' || currentPath === '/user/orders') {
      return 'me'
    }
    
    // Bag routes - check this before home to ensure bag takes priority
    if (currentPath === '/user/bag' || currentPath.startsWith('/user/bag/')) {
      return 'bag'
    }
    
    // Home - only active on exact root path
    if (currentPath === '/') {
      return 'home'
    }
    
    // For all other paths, no item should be active
    return null
  }

  const activeIcon = getActiveItem()

  const handleMeClick = () => {
    // If not authenticated or not a regular user, redirect to login
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/phone-entry')
    } else {
      // If authenticated as user, go to profile
      navigate('/user/profile')
    }
  }

  const handleHomeClick = () => {
    navigate('/')
  }

  const handleBagClick = () => {
    // If not authenticated or not a regular user, redirect to login
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/phone-entry', {
        state: {
          returnTo: '/user/bag',
          message: 'Please login to view your bag.'
        }
      })
    } else {
      navigate('/user/bag')
    }
  }

  const handleItemClick = (item) => {
    if (item.label === 'Me') {
      handleMeClick()
    } else if (item.label === 'Bag') {
      handleBagClick()
    } else if (item.label === 'Home') {
      handleHomeClick()
    } else if (item.onClick) {
      item.onClick()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
      <div className="max-w-7xl mx-auto px-2 py-1.5 flex justify-between gap-1">
        {items.map((item) => {
          const IconComponent = iconMap[item.icon] || FaRegCircle
          // Only use route-based active state - ensure only one icon is active at a time
          // item.isActive prop is ignored to prevent conflicts
          const isActive = activeIcon === item.icon

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleItemClick(item)}
              className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-medium focus:outline-none transition-colors"
            >
              <IconComponent 
                size={20} 
                className={isActive ? 'text-[#f4369e]' : 'text-slate-600'} 
              />
              <span className={isActive ? 'text-[#f4369e]' : 'text-slate-600'}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

MobileBottomNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.oneOf(['product', 'service', 'home', 'bag', 'me']).isRequired,
      isActive: PropTypes.bool,
      onClick: PropTypes.func
    })
  )
}

export default MobileBottomNav


