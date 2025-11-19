import PropTypes from 'prop-types'
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
  if (!items?.length) return null

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
      <div className="max-w-7xl mx-auto px-2 py-1.5 flex justify-between gap-1">
        {items.map((item) => {
          const IconComponent = iconMap[item.icon] || FaRegCircle
          const isActive = Boolean(item.isActive)

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
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


