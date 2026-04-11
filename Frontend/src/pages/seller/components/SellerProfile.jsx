import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiLogOut, FiKey, FiUser, FiChevronLeft, FiCamera, FiCreditCard, FiTruck, FiRefreshCw, FiXCircle, FiHeart, FiHeadphones, FiChevronRight } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { uploadFile, updateSellerProfile } from '../../../services/api'
import { updateUserInfo } from '../../../store/authSlice'
import { fixImageUrl } from '../../../utils/image'
import Toast from '../../../components/Toast'

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
}

const sheetVariants = {
    hidden: { y: '100%', transition: { type: 'spring', damping: 40, stiffness: 400 } },
    visible: {
        y: 0,
        transition: {
            type: 'spring',
            damping: 32,
            stiffness: 300,
            mass: 0.8,
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    },
    exit: {
        y: '110%',
        transition: { duration: 0.4, ease: [0.32, 1, 0.4, 1] }
    }
}

const childVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 30 }
    }
}

// Fixed Components defined OUTSIDE for stability
const OrderStatusIcon = ({ icon: Icon, label, color, bgColor }) => (
    <motion.div
        variants={childVariants}
        className="flex flex-col items-center gap-2 group cursor-pointer"
    >
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] ${bgColor} flex items-center justify-center text-xl sm:text-2xl shadow-lg border border-white/5 active:scale-90 transition-transform duration-200`}>
            <Icon className={color} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-black text-slate-300 text-center uppercase tracking-widest leading-tight group-hover:text-white transition-colors">
            {label}
        </span>
    </motion.div>
)

const ActionItem = ({ icon: Icon, label, onClick }) => (
    <motion.button
        variants={childVariants}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 px-4 sm:px-5 group rounded-[22px] bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all duration-300"
    >
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-rose-500/30 transition-all">
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-black text-slate-100 group-hover:text-white transition-colors tracking-tight">{label}</span>
        </div>
        <FiChevronRight className="w-5 h-5 text-slate-500 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
    </motion.button>
)

function SellerProfile({ isOpen, onClose, user, onLogout, onResetPassword, onEditProfile }) {
    const dispatch = useDispatch()
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type })
    }


    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            if (navigator.vibrate) navigator.vibrate(10)
        } else {
            document.body.style.overflow = 'unset'
            setPreviewUrl(null)
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

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
        try {
            const uploadRes = await uploadFile(file)
            const imageUrl = uploadRes.url
            await updateSellerProfile(user.id, { image_url: imageUrl })
            dispatch(updateUserInfo({ image_url: imageUrl }))
            showToast('Profile picture updated!', 'success')
        } catch (error) {
            console.error('Upload failed:', error)
            showToast(error.message || 'Failed to update profile picture', 'error')
            setPreviewUrl(null)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={onClose}
                    />

                    <motion.div
                        className="fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none overflow-hidden"
                    >
                        <motion.div
                            className="w-full max-w-lg mx-auto bg-[#0f1218] rounded-t-[45px] shadow-[0_-25px_80px_-15px_rgba(0,0,0,0.8)] pointer-events-auto relative flex flex-col"
                            variants={sheetVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.1}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) onClose()
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                                height: 'auto',
                                maxHeight: '94vh',
                                minHeight: '70vh'
                            }}
                        >
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/10 z-50 pointer-events-none" />

                            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-[env(safe-area-inset-bottom,32px)] pt-[env(safe-area-inset-top,0px)] px-4">
                                <div className="relative pt-6 pb-2 flex flex-col items-center">
                                    <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6 sm:px-8 z-30">
                                        <motion.button 
                                            whileTap={{ scale: 0.9 }}
                                            onClick={onClose} 
                                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-xl"
                                        >
                                            <FiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </motion.button>
                                        <h2 className="text-white/40 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em]">Merchant Profile</h2>
                                        <div className="w-10 sm:w-11" />
                                    </div>

                                    <div className="absolute top-0 left-0 right-0 h-64 z-0 pointer-events-none">
                                        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-rose-500/10 via-transparent to-transparent" />
                                        <svg viewBox="0 0 500 200" className="w-full h-full opacity-40 scale-110" preserveAspectRatio="none">
                                            <path 
                                                fill="#FF2E63" 
                                                fillOpacity="0.1"
                                                d="M0,80 C150,150 350,20 500,80 L500,0 L0,0 Z" 
                                            />
                                        </svg>
                                    </div>

                                    <motion.div 
                                        variants={childVariants}
                                        className="relative z-10 mt-16 flex flex-col items-center"
                                    >
                                        <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-[#FF2E63] via-rose-400 to-[#FF2E63] shadow-[0_0_40px_rgba(255,46,99,0.3)] animate-gradient-slow overflow-visible relative">
                                            <div className="w-full h-full rounded-full border-[6px] border-[#0f1218] bg-[#1a1f2e] flex items-center justify-center overflow-hidden relative group">
                                                <AnimatePresence>
                                                    {isUploading && (
                                                        <motion.div 
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2"
                                                        >
                                                            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-widest">Saving...</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                
                                                {previewUrl || user?.image_url || user?.image ? (
                                                    <img 
                                                        src={fixImageUrl(previewUrl || user.image_url || user.image)} 
                                                        alt="Avatar" 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "https://ui-avatars.com/api/?name=" + (user?.trade_id || "S") + "&background=FF2E63&color=fff";
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-4xl sm:text-6xl font-black text-white glow-text">
                                                        {user?.trade_id?.charAt(0).toUpperCase() || 'S'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <motion.label 
                                            htmlFor="profile-upload"
                                            whileTap={{ scale: 0.9 }}
                                            className="absolute bottom-0 right-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white text-[#0f1218] flex items-center justify-center shadow-2xl border-4 border-[#0f1218] cursor-pointer z-30 hover:bg-[#FF2E63] hover:text-white transition-colors duration-300"
                                        >
                                            <FiCamera className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <input 
                                                type="file" 
                                                id="profile-upload" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={handleImageChange}
                                                disabled={isUploading}
                                            />
                                        </motion.label>
                                    </motion.div>

                                    <motion.div variants={childVariants} className="text-center px-6 mt-6 z-10 w-full">
                                        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                                            {user?.trade_id || 'Seller Account'}
                                        </h3>
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Merchant Account</span>
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="px-3 sm:px-8 mt-10 sm:mt-12 mb-10">
                                    <motion.div variants={childVariants} className="flex items-center gap-3 mb-8">
                                        <div className="w-1.5 h-6 bg-[#FF2E63] rounded-full" />
                                        <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Activity Overview</h4>
                                    </motion.div>
                                    <div className="grid grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-3 sm:gap-x-4">
                                        <OrderStatusIcon icon={FiCreditCard} label="Pending" color="text-cyan-400" bgColor="bg-cyan-500/5" />
                                        <OrderStatusIcon icon={FiTruck} label="Delivered" color="text-yellow-400" bgColor="bg-yellow-500/5" />
                                        <OrderStatusIcon icon={FiRefreshCw} label="Active" color="text-pink-400" bgColor="bg-pink-500/5" />
                                        <OrderStatusIcon icon={FiXCircle} label="Cancelled" color="text-emerald-400" bgColor="bg-emerald-500/5" />
                                        <OrderStatusIcon icon={FiHeart} label="Loyalty" color="text-rose-400" bgColor="bg-rose-500/5" />
                                        <OrderStatusIcon icon={FiHeadphones} label="Support" color="text-indigo-400" bgColor="bg-indigo-500/5" />
                                    </div>
                                </div>

                                <div className="px-3 sm:px-5 space-y-3 mb-10">
                                    <ActionItem icon={FiUser} label="Personal Credentials" onClick={onEditProfile} />
                                    <ActionItem icon={FiKey} label="Vault & Security" onClick={onResetPassword} />
                                </div>

                                <div className="px-8 pb-10 flex flex-col items-center gap-8">
                                        <motion.button
                                            variants={childVariants}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={onLogout}
                                            className="w-full max-w-[280px] flex items-center justify-center gap-3 py-4 text-rose-500 font-bold uppercase tracking-widest text-[11px] bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl border border-rose-500/20 transition-all group"
                                        >
                                            <FiLogOut className="w-4 h-4" />
                                            Logout Profile
                                        </motion.button>
                                    <motion.div variants={childVariants} className="text-center opacity-40">
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">BBHC BAZAAR SELLER PLATFORM</p>
                                        <p className="text-[7px] font-semibold text-slate-600 mt-1">v2.4.0 • CLOUD SECURE • ENCRYPTED</p>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <Toast
                        message={toast.message}
                        type={toast.type}
                        isVisible={toast.show}
                        onClose={() => setToast(prev => ({ ...prev, show: false }))}
                    />
                </>
            )}
        </AnimatePresence>
    )
}

export default SellerProfile
