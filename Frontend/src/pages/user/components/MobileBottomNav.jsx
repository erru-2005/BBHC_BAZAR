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
    { label: 'Product', icon: 'product', path: '/products' },
    { label: 'Service', icon: 'service', path: '/services' },
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
        if (currentPath === '/products') return 'product'
        if (currentPath === '/services') return 'service'
        if (currentPath === '/wishlist') return 'wishlist'

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
        } else if (item.label === 'Product') {
            navigate('/products')
        } else if (item.label === 'Service') {
            navigate('/services')
        } else if (item.onClick) {
            item.onClick()
        } else if (item.path) {
            navigate(item.path)
        }
    }

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-slate-100/50 rounded-t-2xl shadow-[0_-4px_20px_rgb(0,0,0,0.08)] z-40 p-2">
            <div className="flex justify-between items-center">
                {items.map((item) => {
                    const IconComponent = iconMap[item.icon] || FaRegCircle
                    const isActive = activeIcon === item.icon

                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => handleItemClick(item)}
                            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all duration-300 ${isActive ? '-translate-y-1' : 'hover:bg-slate-50'
                                }`}
                        >
                            {/* Active Indicator & Icon Background */}
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-tr from-[#f4369e] to-purple-500 text-white shadow-lg shadow-pink-500/30 scale-110'
                                    : 'text-slate-400 group-hover:text-slate-600'
                                    }`}
                            >
                                <IconComponent size={isActive ? 18 : 20} className="transition-transform duration-300" />
                            </div>

                            {/* Label */}
                            <span
                                className={`text-[10px] font-semibold transition-colors duration-300 ${isActive ? 'text-[#f4369e]' : 'text-slate-400'
                                    }`}
                            >
                                {item.label}
                            </span>
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


