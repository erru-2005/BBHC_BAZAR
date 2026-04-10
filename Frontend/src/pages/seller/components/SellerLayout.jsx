import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import SellerBottomNav from './SellerBottomNav'
import SellerProfile from './SellerProfile'
import { AnimatePresence, motion } from 'framer-motion'
import { logout } from '../../../store/authSlice'
import { clearDeviceToken } from '../../../utils/device'
import { getSocket, disconnectSocket } from '../../../utils/socket'
import PasswordResetDialog from '../../../components/PasswordResetDialog'

// Lazy load the overlay to keep bundle small
const AddProductOverlay = lazy(() => import('./AddProductOverlay'))

export default function SellerLayout() {
    const [showProfile, setShowProfile] = useState(false)
    const [isAddingProduct, setIsAddingProduct] = useState(false)
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { user } = useSelector((state) => state.auth)

    const isDashboard = location.pathname === '/seller/dashboard'
    const isOrdersView = isDashboard && location.state?.view === 'orders'

    const handleSetShowOrders = (show) => {
        if (show) {
            if (!isDashboard) {
                navigate('/seller/dashboard', { state: { view: 'orders' } })
            } else {
                navigate('/seller/dashboard', { state: { view: 'orders' }, replace: true })
            }
        } else {
            if (!isDashboard) {
                navigate('/seller/dashboard', { state: { view: 'dashboard' } })
            } else {
                navigate('/seller/dashboard', { state: { view: 'dashboard' }, replace: true })
            }
        }
    }

    const handleLogout = () => {
        const socket = getSocket()
        if (socket && socket.connected && user) {
            socket.emit('user_logout', {
                user_id: user.id,
                user_type: 'seller'
            })
        }
        disconnectSocket()
        clearDeviceToken()
        localStorage.removeItem('seller_active_tab')
        dispatch(logout())
        navigate('/seller/login')
    }

    return (
        <div className="relative min-h-screen spatial-bg selection:bg-rose-500/30">
            {/* Global Mesh Gradient / Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
            </div>

            <main className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname + (location.state?.view || '')}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Persistent Bottom Nav */}
            <SellerBottomNav
                showOrders={isOrdersView}
                setShowOrders={handleSetShowOrders}
                onOpenProfile={setShowProfile}
                onOpenAddProduct={() => setIsAddingProduct(true)}
            />

            {/* Blooming Add Product Overlay */}
            <AnimatePresence>
                {isAddingProduct && (
                    <Suspense fallback={null}>
                        <AddProductOverlay
                            isOpen={isAddingProduct}
                            onClose={() => setIsAddingProduct(false)}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            {/* Profile Drawer */}
            <AnimatePresence>
                {showProfile && (
                    <SellerProfile
                        isOpen={showProfile}
                        onClose={() => setShowProfile(false)}
                        user={user}
                        onLogout={handleLogout}
                        onResetPassword={() => setResetPasswordOpen(true)}
                        onEditProfile={() => {
                            setShowProfile(false)
                        }}
                    />
                )}
            </AnimatePresence>

            <PasswordResetDialog
                open={resetPasswordOpen}
                onClose={() => setResetPasswordOpen(false)}
                userType="seller"
                identifier={user?.trade_id}
                displayLabel="Seller"
            />
        </div>
    )
}
