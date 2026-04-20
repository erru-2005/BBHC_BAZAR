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

export default function SellerBottomNav({ showOrders, setShowOrders, isProfileActive, onOpenProfile, onOpenAddProduct }) {
    const navigate = useNavigate()
    const location = useLocation()

    const getActiveTab = () => {
        if (isProfileActive) return 'profile'
        if (showOrders) return 'orders'
        if (location.pathname.startsWith('/seller/products')) return 'products'
        if (location.pathname.startsWith('/seller/services')) return 'products'
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
            label: 'Vault',
            icon: HiOutlineCube,
            activeIcon: HiCube,
            action: () => navigate('/seller/products')
        },
        {
            id: 'profile',
            label: 'Account',
            icon: HiOutlineUser,
            activeIcon: HiUser,
            action: () => onOpenProfile && onOpenProfile(true)
        }
    ]

    return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full md:hidden pointer-events-none flex justify-center">
    <div className="relative w-full max-w-md h-[92px] pointer-events-auto">
                {/* SVG Curve Background - Premium Light Theme */}
                <div className="absolute inset-0 z-0 px-2">
                    <svg
                        viewBox="0 0 375 88"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full text-white/95 backdrop-blur-xl drop-shadow-[0_-5px_20px_rgba(0,0,0,0.06)]"
                    >
                        <path
                            fill="currentColor"
                            d="M0,15 
                               H142.5 
                               C152.5,15 157.5,25 162.5,35 
                               C172.5,45 202.5,45 212.5,35 
                               C217.5,25 222.5,15 232.5,15 
                               H375 
                               V88 
                               H0 
                               Z"
                        />
                    </svg>
                </div>

                <div className="relative flex h-full w-full items-center pb-2 z-10 px-4">
                    {/* Left Group */}
                    <div className="flex flex-1 justify-around items-center pr-10">
                        {navItems.slice(0, 2).map((item) => {
                            const isActive = activeTab === item.id
                            const Icon = isActive ? (item.activeIcon || item.icon) : item.icon
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="group relative flex flex-col items-center justify-center p-1 flex-1 min-w-0"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="mb-1"
                                    >
                                        <Icon
                                            className={`h-[22px] w-[22px] transition-all duration-500 ${isActive
                                                ? 'text-blue-600 scale-110'
                                                : 'text-slate-400 group-hover:text-slate-600'
                                                }`}
                                            strokeWidth={isActive ? 0 : 2}
                                        />
                                    </motion.div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Center Floating Button */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-10 flex w-20 justify-center shrink-0 z-20">
                        <motion.button
                            layoutId="add-product-fab"
                            initial={{ borderRadius: "9999px" }}
                            animate={{ borderRadius: "9999px" }}
                            whileTap={{ scale: 0.9, rotate: -90 }}
                            whileHover={{ 
                                scale: 1.15, 
                                rotate: 90,
                                boxShadow: "0 25px 40px -10px rgba(15, 23, 42, 0.4)" 
                            }}
                            onClick={onOpenAddProduct}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_20px_40px_-5px_rgba(15,23,42,0.3)] ring-[6px] ring-white relative group overflow-hidden"
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            {/* Animated Ripple Background */}
                            <motion.div 
                                className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                initial={false}
                            />
                            
                            <HiPlus className="h-9 w-9 text-white relative z-10" strokeWidth={3} />
                            
                            {/* Glow Effect */}
                            <motion.div 
                                className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        </motion.button>
                        
                        {/* Pulse Aura */}
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 -z-10 bg-blue-500 rounded-full blur-2xl"
                        />
                    </div>

                    {/* Right Group */}
                    <div className="flex flex-1 justify-around items-center pl-10">
                        {navItems.slice(3).map((item) => {
                            const isActive = activeTab === item.id
                            const Icon = isActive ? (item.activeIcon || item.icon) : item.icon
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="group relative flex flex-col items-center justify-center p-1 flex-1 min-w-0"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="mb-1"
                                    >
                                        <Icon
                                            className={`h-[22px] w-[22px] transition-all duration-500 ${isActive
                                                ? 'text-blue-600 scale-110'
                                                : 'text-slate-400 group-hover:text-slate-600'
                                                }`}
                                            strokeWidth={isActive ? 0 : 2}
                                        />
                                    </motion.div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
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
    isProfileActive: PropTypes.bool,
    onOpenProfile: PropTypes.func,
    onOpenAddProduct: PropTypes.func
}
