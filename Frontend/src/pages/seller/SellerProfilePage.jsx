import { 
    FiChevronLeft, FiCamera, FiCreditCard, FiTruck, FiRefreshCw, 
    FiXCircle, FiHeart, FiHeadphones, FiUser, FiKey, FiLogOut, FiShoppingBag
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { uploadAvatar, updateSellerProfile } from '../../services/api'
import { updateUserInfo, restoreUser } from '../../store/authSlice'
import { fixImageUrl, compressToWebP } from '../../utils/image'
import Toast from '../../components/Toast'
import { AnimatePresence, motion } from 'framer-motion'

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { 
            duration: 0.5,
            staggerChildren: 0.1
        }
    }
}

const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
}

const OrderStatusIcon = ({ icon: Icon, label, color, bgColor }) => (
    <motion.div
        variants={childVariants}
        className="flex flex-col items-center gap-4 group cursor-pointer"
    >
        <div className={`w-24 h-24 rounded-[4px] ${bgColor} flex items-center justify-center text-4xl shadow-sm border border-white group-hover:scale-110 transition-all duration-500`}>
            <Icon className={color} />
        </div>
        <span className="text-xs font-semibold text-slate-500 text-center tracking-normal leading-tight group-hover:text-blue-600 transition-colors">
            {label}
        </span>
    </motion.div>
)

const ActionItem = ({ icon: Icon, label, onClick }) => (
    <motion.button
        variants={childVariants}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 px-8 group rounded-[4px] bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-500 shadow-sm hover:shadow-md"
    >
        <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-[2px] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-white transition-all shadow-inner">
                <Icon className="w-6 h-6" />
            </div>
            <span className="text-base font-bold text-slate-800 group-hover:text-slate-900 transition-colors tracking-tight">{label}</span>
        </div>
        <div className="w-10 h-10 rounded-[2px] flex items-center justify-center bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <FiChevronLeft className="w-5 h-5 transition-transform rotate-180 group-hover:translate-x-1" />
        </div>
    </motion.button>
)

export default function SellerProfilePage() {
    const { user } = useSelector((state) => state.auth)
    const { onLogout, onResetPassword, onEditProfile } = useOutletContext()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
    const [switchingRole, setSwitchingRole] = useState(false)
    const hasUserToken = !!localStorage.getItem('bbhc_user_token')

    const handleRoleSwitch = () => {
        setSwitchingRole(true)
        setTimeout(() => {
            window.location.href = '/user/profile'
        }, 1500)
    }

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type })
    }

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error')
            return
        }

        const localUrl = URL.createObjectURL(file)
        setPreviewUrl(localUrl)

        setIsUploading(true)
        setUploadSuccess(false)
        try {
            const compressedFile = await compressToWebP(file, 256, 256, 0.8)
            const uploadRes = await uploadAvatar(compressedFile, user.id)
            const imageUrl = uploadRes.url
            await updateSellerProfile(user.id, { image_url: imageUrl })
            dispatch(updateUserInfo({ image_url: imageUrl }))
            setUploadSuccess(true)
            showToast('Profile picture updated!', 'success')
            setTimeout(() => setUploadSuccess(false), 3000)
        } catch (error) {
            console.error('Upload failed:', error)
            showToast(error.message || 'Failed to update profile picture', 'error')
            setPreviewUrl(null)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 overflow-hidden relative">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
            <motion.div 
                animate={{ 
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" 
            />
            <motion.div 
                animate={{ 
                    x: [0, -80, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" 
            />

            <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-16">
                    <motion.button 
                        whileHover={{ scale: 1.05, x: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-3 px-6 py-3 rounded-[4px] bg-white border border-slate-200 shadow-sm text-slate-800 font-bold hover:shadow-md transition-all group"
                    >
                        <FiChevronLeft className="w-5 h-5 group-hover:text-blue-600 transition-colors" strokeWidth={2.5} />
                        <span>Go Back</span>
                    </motion.button>
                    
                    <div className="text-center">
                        <p className="text-slate-400 font-bold text-xs tracking-[0.3em] uppercase">Seller Control Center</p>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Identity Portfolio</h1>
                    </div>

                    <div className="w-32 hidden sm:block" /> {/* Spacer */}
                </div>

                <div className="grid lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column: Profile Card */}
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-5 space-y-8"
                    >
                        <div className="bg-white rounded-[4px] p-10 shadow-2xl shadow-blue-900/5 border border-white relative overflow-hidden group">
                            {/* Card Background Decoration */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 transition-transform group-hover:scale-150 duration-1000" />
                            
                            <div className="relative flex flex-col items-center">
                                {/* Profile Image Section */}
                                <div className="relative mb-8">
                                    <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full p-2 bg-gradient-to-tr from-blue-600 via-indigo-400 to-blue-600 shadow-2xl relative">
                                        <div className="w-full h-full rounded-full border-[8px] border-white bg-slate-50 overflow-hidden relative shadow-inner">
                                            {isUploading && (
                                                <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-md flex items-center justify-center">
                                                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                                </div>
                                            )}
                                            
                                                {previewUrl || user?.image_url || user?.image ? (
                                                    <div className="w-full h-full relative overflow-hidden rounded-full bg-slate-100">
                                                        <motion.div 
                                                            initial={{ scale: 1.5 }}
                                                            animate={{ scale: 1.2 }}
                                                            transition={{ duration: 0.7 }}
                                                            className="w-full h-full"
                                                            style={{ 
                                                                backgroundImage: `url(${fixImageUrl(previewUrl || user.image_url || user.image)})`,
                                                                backgroundSize: 'cover',
                                                                backgroundPosition: 'center',
                                                                backgroundRepeat: 'no-repeat'
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                    <span className="text-8xl font-black text-blue-100 uppercase">
                                                        {user?.first_name?.charAt(0) || user?.name?.charAt(0) || 'S'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <motion.label 
                                        whileHover={{ scale: 1.1, rotate: 12 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="absolute bottom-2 right-4 w-16 h-16 rounded-[2px] bg-slate-900 text-white flex items-center justify-center shadow-2xl border-4 border-white cursor-pointer z-30"
                                    >
                                        <FiCamera className="w-7 h-7" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
                                    </motion.label>

                                    {/* Professional Success Indicator - Neatly Aligned to the Right */}
                                    <AnimatePresence>
                                        {uploadSuccess && (
                                            <motion.div 
                                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                className="absolute -right-16 top-1/2 -translate-y-1/2 z-40"
                                            >
                                                <div className="bg-white/95 backdrop-blur-2xl p-5 pr-10 rounded-[4px] border border-emerald-100 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)] flex items-center gap-5 min-w-[280px]">
                                                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 relative">
                                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        {/* Animated Ring */}
                                                        <div className="absolute -inset-1 rounded-full border-2 border-emerald-500 animate-ping opacity-20" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-emerald-600 font-black text-sm uppercase tracking-[0.2em] mb-0.5">Success</span>
                                                        <span className="text-slate-900 font-bold text-xs">Profile Photo Updated</span>
                                                        <div className="h-1 w-12 bg-emerald-100 rounded-full mt-2" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="text-center space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight capitalize">
                                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || 'Seller Account')}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verified Seller</span>
                                    </div>
                                    <p className="text-slate-400 text-sm font-semibold pt-2">{user?.trade_id || 'TRD-8829-X'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Switch to User Profile */}
                        {hasUserToken && (
                            <motion.button
                                variants={childVariants}
                                whileHover={{ scale: 1.02, backgroundColor: "#F0F9FF" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleRoleSwitch}
                                disabled={switchingRole}
                                className="w-full flex items-center justify-center gap-4 py-8 mb-4 text-blue-600 font-bold uppercase tracking-[0.2em] text-xs bg-white rounded-[4px] border border-blue-50 hover:border-blue-200 transition-all shadow-sm disabled:opacity-75"
                            >
                                <FiShoppingBag className="w-6 h-6" />
                                {switchingRole ? 'Switching...' : 'Switch to User Dashboard'}
                            </motion.button>
                        )}

                        {/* Logout Button */}
                        <motion.button
                            variants={childVariants}
                            whileHover={{ scale: 1.02, backgroundColor: "#FFF1F2" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-4 py-8 text-rose-600 font-bold uppercase tracking-[0.2em] text-xs bg-white rounded-[4px] border border-rose-50 hover:border-rose-200 transition-all shadow-sm"
                        >
                            <FiLogOut className="w-6 h-6" />
                            Terminate Session
                        </motion.button>
                    </motion.div>

                    {/* Right Column: Console & Actions */}
                    <div className="lg:col-span-7 space-y-12">
                        {/* Activity Console */}
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="bg-white rounded-[4px] p-12 border border-white shadow-2xl shadow-blue-900/5"
                        >
                            <div className="flex items-center gap-5 mb-12">
                                <div className="w-2 h-8 bg-blue-600 rounded-none shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Activity Console</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-16 gap-x-6">
                                <OrderStatusIcon icon={FiCreditCard} label="Liquidity" color="text-blue-600" bgColor="bg-blue-50/50 border-blue-100/50" />
                                <OrderStatusIcon icon={FiTruck} label="Logistics" color="text-indigo-600" bgColor="bg-indigo-50/50 border-indigo-100/50" />
                                <OrderStatusIcon icon={FiRefreshCw} label="Dynamics" color="text-amber-600" bgColor="bg-amber-50/50 border-amber-100/50" />
                                <OrderStatusIcon icon={FiXCircle} label="Revoked" color="text-rose-600" bgColor="bg-rose-50/50 border-rose-100/50" />
                                <OrderStatusIcon icon={FiHeart} label="Loyalty" color="text-emerald-600" bgColor="bg-emerald-50/50 border-emerald-100/50" />
                                <OrderStatusIcon icon={FiHeadphones} label="Support" color="text-slate-600" bgColor="bg-slate-50/50 border-slate-100/50" />
                            </div>
                        </motion.div>

                        {/* Security & Settings */}
                        <div className="space-y-6">
                            <ActionItem icon={FiUser} label="Identity Profile Configuration" onClick={onEditProfile} />
                            <ActionItem icon={FiKey} label="Security Protocol & Architecture" onClick={onResetPassword} />
                        </div>
                        
                        <div className="text-center opacity-20 pt-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Enterprise Cloud Environment v3.0.0</p>
                            <div className="h-px w-32 bg-slate-300 mx-auto mt-4" />
                        </div>
                    </div>
                </div>
            </div>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.show}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
            
            <AnimatePresence>
                {switchingRole && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl"
                        >
                            <FiShoppingBag className="w-10 h-10 text-blue-600 animate-pulse" />
                        </motion.div>
                        <motion.h2 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold text-white mb-2 text-center px-4"
                        >
                            Switching to User Profile...
                        </motion.h2>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-blue-100 text-center px-4"
                        >
                            Loading your user dashboard
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
