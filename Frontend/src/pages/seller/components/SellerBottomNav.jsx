import { useNavigate, useLocation } from 'react-router-dom'
import {
    HiHome, HiOutlineHome,
    HiClipboardDocumentList, HiOutlineClipboardDocumentList,
    HiCube, HiOutlineCube,
    HiUser, HiOutlineUser,
    HiPlus
} from 'react-icons/hi2'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

export default function SellerBottomNav({ showOrders, setShowOrders, onOpenProfile, onOpenAddProduct }) {
    const navigate = useNavigate()
    const location = useLocation()

    const getActiveTab = () => {
        if (showOrders) return 'orders'
        if (location.pathname === '/seller/products') return 'products'
        if (location.pathname === '/seller/dashboard' && !showOrders) return 'home'
        return ''
    }

    const activeTab = getActiveTab()

    const navItems = [
        {
            id: 'home',
            label: 'Home',
            icon: HiOutlineHome,
            activeIcon: HiHome,
            action: () => {
                setShowOrders(false)
                if (location.pathname !== '/seller/dashboard') {
                    navigate('/seller/dashboard')
                }
            }
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: HiOutlineClipboardDocumentList,
            activeIcon: HiClipboardDocumentList,
            action: () => {
                if (location.pathname !== '/seller/dashboard') {
                    navigate('/seller/dashboard', { state: { view: 'orders' } })
                } else {
                    setShowOrders(true)
                }
            }
        },
        {
            id: 'add-product',
            isPrimary: true,
            action: onOpenAddProduct
        },
        {
            id: 'products',
            label: 'Products',
            icon: HiOutlineCube,
            activeIcon: HiCube,
            action: () => navigate('/seller/products')
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: HiOutlineUser,
            activeIcon: HiUser,
            action: () => onOpenProfile && onOpenProfile(true)
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full md:hidden pointer-events-none">
            {/* Spacer */}
            <div className="h-24" />

            <div className="absolute bottom-0 left-0 right-0 h-[88px] pointer-events-auto">
                {/* SVG Curve Background - Dark Glassmorphism */}
                <div className="absolute inset-0 z-0">
                    <svg
                        viewBox="0 0 375 88"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full text-[#0f172a]/95 backdrop-blur-2xl"
                    >
                        <path
                            fill="currentColor"
                            d="M0,12 
                               H134 
                               C144,12 152,24 162,34 
                               C172,44 203,44 213,34 
                               C223,24 231,12 241,12 
                               H375 
                               V88 
                               H0 
                               Z"
                        />
                    </svg>
                    {/* Inner Glow Stripe */}
                    <div className="absolute top-[12px] h-[1px] left-0 right-0 bg-white/5 shadow-[0_1px_5px_rgba(255,255,255,0.1)]" style={{ clipPath: 'polygon(0 0, 134px 0, 162px 22px, 213px 22px, 241px 0, 100% 0, 100% 100%, 0 100%)' }} />
                </div>

                <div className="relative flex h-full w-full items-end pb-3 z-10">
                    {/* Left Group */}
                    <div className="flex flex-1 justify-around px-1">
                        {navItems.slice(0, 2).map((item) => {
                            const isActive = activeTab === item.id
                            const Icon = isActive ? (item.activeIcon || item.icon) : item.icon
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="group relative flex flex-col items-center justify-center gap-1 min-w-[60px] p-2"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        whileHover={{ y: -2 }}
                                    >
                                        <Icon
                                            className={`h-[26px] w-[26px] transition-all duration-300 ${isActive
                                                ? 'text-[#fb7185] active-glow'
                                                : 'text-slate-300 group-hover:text-slate-100'
                                                }`}
                                            strokeWidth={isActive ? 0 : 2}
                                        />
                                    </motion.div>
                                    <span className={`text-[10px] font-black tracking-tight transition-colors ${isActive ? 'text-white' : 'text-slate-400'
                                        }`}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            className="absolute bottom-1 h-0.5 w-6 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Center Floating Button - The Bloom Source */}
                    <div className="relative -top-7 flex w-20 justify-center">
                        <motion.button
                            layoutId="add-product-fab"
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={onOpenAddProduct}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_8px_32px_rgba(244,63,94,0.4)] ring-[5px] ring-[#0f172a]"
                        >
                            <HiPlus className="h-8 w-8 text-white" strokeWidth={2.5} />
                        </motion.button>
                    </div>

                    {/* Right Group */}
                    <div className="flex flex-1 justify-around px-1">
                        {navItems.slice(3).map((item) => {
                            const isActive = activeTab === item.id
                            const Icon = isActive ? (item.activeIcon || item.icon) : item.icon
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="group relative flex flex-col items-center justify-center gap-1 min-w-[60px] p-2"
                                >
                                    <motion.div
                                        layoutId={item.id === 'profile' ? "profile-morph-source" : undefined}
                                        whileTap={{ scale: 0.9 }}
                                        whileHover={{ y: -2 }}
                                        className="flex flex-col items-center"
                                    >
                                        <Icon
                                            className={`h-[26px] w-[26px] transition-all duration-300 ${isActive
                                                ? 'text-[#fb7185] active-glow'
                                                : 'text-slate-300 group-hover:text-slate-100'
                                                }`}
                                            strokeWidth={isActive ? 0 : 2}
                                        />
                                    </motion.div>
                                    <span className={`text-[10px] font-black tracking-tight transition-colors ${isActive ? 'text-white' : 'text-slate-400'
                                        }`}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            className="absolute bottom-1 h-0.5 w-6 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

SellerBottomNav.propTypes = {
    showOrders: PropTypes.bool,
    setShowOrders: PropTypes.func,
    onOpenProfile: PropTypes.func,
    onOpenAddProduct: PropTypes.func
}
