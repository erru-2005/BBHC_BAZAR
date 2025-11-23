import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
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
  { label: 'Product', icon: 'product' },
  { label: 'Service', icon: 'service' },
  { label: 'Home', icon: 'home', isActive: true },
  { label: 'Bag', icon: 'bag' },
  { label: 'Me', icon: 'me' }
]

function MobileBottomNav({ items = defaultItems }) {
  const navigate = useNavigate()
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)
  
  if (!items?.length) return null

  const handleMeClick = () => {
    // If not authenticated or not a regular user, redirect to login
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/phone-entry')
    } else {
      // If authenticated as user, go to profile
      navigate('/user/profile')
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
      <div className="max-w-7xl mx-auto px-2 py-1.5 flex justify-between gap-1">
        {items.map((item) => {
          const IconComponent = iconMap[item.icon] || FaRegCircle
          const isActive = Boolean(item.isActive)
          
          // Use provided onClick or default handler for "Me" button
          const handleClick = item.onClick || (item.label === 'Me' ? handleMeClick : undefined)

          return (
            <button
              key={item.label}
              type="button"
              onClick={handleClick}
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


