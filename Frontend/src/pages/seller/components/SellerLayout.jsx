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
import SellerEditProfile from '../../../components/SellerEditProfile'

// Lazy load the overlay to keep bundle small
const AddProductOverlay = lazy(() => import('./AddProductOverlay'))

export default function SellerLayout() {
    const [showProfile, setShowProfile] = useState(false)
    const [isAddingProduct, setIsAddingProduct] = useState(false)
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
    const [editProfileOpen, setEditProfileOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { user } = useSelector((state) => state.auth)

    console.log('[SellerLayout] Current path:', location.pathname)
    console.log('[SellerLayout] Current state:', location.state)

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
                <Outlet />
            </main>

            {/* Persistent Bottom Nav */}
            <SellerBottomNav
                showOrders={isOrdersView}
                setShowOrders={handleSetShowOrders}
                isProfileActive={showProfile || resetPasswordOpen || editProfileOpen}
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
                        onResetPassword={() => {
                            setShowProfile(false)
                            setResetPasswordOpen(true)
                        }}
                        onEditProfile={() => {
                            setShowProfile(false)
                            setEditProfileOpen(true)
                        }}
                    />
                )}
            </AnimatePresence>

            <PasswordResetDialog
                open={resetPasswordOpen}
                onClose={() => {
                    setResetPasswordOpen(false)
                    setShowProfile(true)
                }}
                userType="seller"
                identifier={user?.trade_id}
                displayLabel="Seller"
            />

            <SellerEditProfile
                open={editProfileOpen}
                onClose={() => {
                    setEditProfileOpen(false)
                    setShowProfile(true)
                }}
                user={user}
            />
        </div>
    )
}
