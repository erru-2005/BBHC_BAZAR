import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaHandshake,
  FaHouse,
  FaBagShopping,
  FaUserLarge,
  FaClipboardList,
} from 'react-icons/fa6'
import { LimelightNav } from './LimelightNav'

const iconMap = {
  orders: FaClipboardList,
  service: FaHandshake,
  home: FaHouse,
  bag: FaBagShopping,
  me: FaUserLarge,
}

const defaultItems = [
  { label: 'Orders', icon: 'orders', path: '/user/orders' },
  { label: 'Service', icon: 'service', path: '/services' },
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Bag', icon: 'bag', path: '/user/bag' },
  { label: 'Me', icon: 'me', path: '/user/profile' },
]

function MobileBottomNav({ items = defaultItems }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, userType } = useSelector((state) => state.auth)

  if (!items?.length) return null

  const getActiveItem = () => {
    const currentPath = location.pathname

    if (currentPath === '/user/profile') {
      return 'me'
    }

    if (currentPath === '/user/bag' || currentPath.startsWith('/user/bag/')) {
      return 'bag'
    }

    if (currentPath === '/user/orders' || currentPath.startsWith('/user/orders/')) {
      return 'orders'
    }

    if (
      currentPath === '/' ||
      currentPath.startsWith('/product/') ||
      currentPath === '/products' ||
      currentPath.startsWith('/products/') ||
      currentPath === '/wishlist'
    ) {
      return 'home'
    }

    if (
      currentPath === '/services' ||
      currentPath.startsWith('/services/') ||
      currentPath.startsWith('/service/')
    ) {
      return 'service'
    }

    return null
  }

  const activeIcon = getActiveItem()

  const handleMeClick = () => {
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/login')
    } else {
      navigate('/user/profile')
    }
  }

  const handleHomeClick = () => {
    navigate('/')
  }

  const handleBagClick = () => {
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/login', {
        state: {
          returnTo: '/user/bag',
          message: 'Please login to view your bag.',
        },
      })
    } else {
      navigate('/user/bag')
    }
  }

  const handleOrdersClick = () => {
    if (!isAuthenticated || !user || userType === 'seller' || userType === 'master') {
      navigate('/user/login', {
        state: {
          returnTo: '/user/orders',
          message: 'Please login to view your orders.',
        },
      })
    } else {
      navigate('/user/orders')
    }
  }

  const handleItemClick = (item) => {
    if (item.label === 'Me') {
      handleMeClick()
    } else if (item.label === 'Bag') {
      handleBagClick()
    } else if (item.label === 'Home') {
      handleHomeClick()
    } else if (item.label === 'Orders') {
      handleOrdersClick()
    } else if (item.label === 'Service') {
      navigate('/services')
    } else if (item.onClick) {
      item.onClick()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const normalizedItems = items.map((item) => {
    const iconKey = item.icon === 'product' ? 'orders' : item.icon
    const label = item.label === 'Product' ? 'Orders' : item.label
    const IconComponent = iconMap[iconKey] || FaHouse

    return {
      id: iconKey,
      label,
      icon: <IconComponent />,
      onClick: () => handleItemClick({ ...item, icon: iconKey, label }),
    }
  })

  const matchedIndex = normalizedItems.findIndex((item) => item.id === activeIcon)
  const homeIndex = normalizedItems.findIndex((item) => item.id === 'home')
  const activeIndex = matchedIndex >= 0 ? matchedIndex : homeIndex >= 0 ? homeIndex : 0

  return (
    <div className="lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <LimelightNav
        items={normalizedItems}
        activeIndex={activeIndex}
        className="pointer-events-auto w-full"
        iconClassName="text-white"
      />
    </div>
  )
}

MobileBottomNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.oneOf(['orders', 'product', 'service', 'home', 'bag', 'me']).isRequired,
      isActive: PropTypes.bool,
      onClick: PropTypes.func,
      path: PropTypes.string,
    })
  ),
}

export default MobileBottomNav
