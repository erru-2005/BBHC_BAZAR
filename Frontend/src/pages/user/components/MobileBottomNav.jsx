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
  { label: 'Bag', icon: 'bag', path: '/' },
  { label: 'Me', icon: 'me', path: '/user/profile' }
]

function MobileBottomNav({ items = defaultItems }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  
  if (!items?.length) return null

  // Determine active item based on current route
  const getActiveItem = () => {
    const currentPath = location.pathname
    if (currentPath === '/user/profile' || currentPath === '/user/orders') {
      return 'me'
    }
    if (currentPath === '/') {
      return 'home'
    }
    // Add more route checks as needed
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

  const handleItemClick = (item) => {
    if (item.label === 'Me') {
      handleMeClick()
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
          // Check if this item should be active based on route or explicit isActive prop
          const isActive = item.isActive || (activeIcon === item.icon)

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


