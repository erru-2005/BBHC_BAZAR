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
        className="flex flex-col items-center gap-3 group cursor-pointer"
    >
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] ${bgColor} flex items-center justify-center text-2xl sm:text-3xl shadow-sm border border-white group-hover:scale-110 transition-all duration-500`}>
            <Icon className={color} />
        </div>
        <span className="text-[11px] font-semibold text-slate-500 text-center tracking-normal leading-tight group-hover:text-blue-600 transition-colors">
            {label}
        </span>
    </motion.div>
)

const ActionItem = ({ icon: Icon, label, onClick }) => (
    <motion.button
        variants={childVariants}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 px-6 group rounded-[1.5rem] bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-500 shadow-sm hover:shadow-md"
    >
        <div className="flex items-center gap-5">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-white transition-all shadow-inner">
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors tracking-tight">{label}</span>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <FiChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
    </motion.button>
)

function SellerProfile({ isOpen, onClose, user, onLogout, onResetPassword, onEditProfile }) {
    const dispatch = useDispatch()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
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
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
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
                            className="w-full max-w-lg mx-auto bg-[#F8FAFC] rounded-t-[3.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.15)] pointer-events-auto relative flex flex-col"
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
                                maxHeight: '96vh',
                                minHeight: '80vh'
                            }}
                        >
                            {/* Handle Bar */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-14 h-1.5 rounded-full bg-slate-200 z-50 pointer-events-none shadow-inner" />

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom,40px)] px-6">
                                <div className="relative pt-10 pb-4 flex flex-col items-center">
                                    {/* Header Controls */}
                                    <div className="absolute top-6 inset-x-0 flex items-center justify-between px-2 z-30">
                                        <motion.button 
                                            whileTap={{ scale: 0.9 }}
                                            onClick={onClose} 
                                            className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-800 shadow-sm hover:shadow-md transition-all active:scale-90"
                                        >
                                            <FiChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                                        </motion.button>
                                        <h2 className="text-slate-400 font-bold text-[11px] tracking-widest uppercase">Seller Profile</h2>
                                        <div className="w-12" />
                                    </div>

                                    {/* Abstract header background */}
                                    <div className="absolute top-0 left-0 right-0 h-72 z-0 pointer-events-none overflow-hidden rounded-t-[3.5rem]">
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
                                        <motion.div 
                                           animate={{ rotate: 360 }}
                                           transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                           className="absolute -top-32 -right-32 w-80 h-80 bg-blue-600/5 blur-[80px] rounded-full"
                                        />
                                    </div>

                                    {/* Profile Image Section */}
                                    <motion.div 
                                        variants={childVariants}
                                        className="relative z-10 mt-20 flex flex-col items-center"
                                    >
                                        <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-full p-2 bg-gradient-to-tr from-blue-600 via-indigo-400 to-blue-600 shadow-2xl relative group/profile">
                                            {/* Outer Ring Decoration */}
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 group-hover/profile:border-blue-500/40 transition-colors" />
                                            
                                            <div className="w-full h-full rounded-full border-[6px] border-[#F8FAFC] bg-white overflow-hidden relative shadow-inner">
                                                <AnimatePresence>
                                                    {isUploading && (
                                                        <motion.div 
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-3"
                                                        >
                                                            <div className="relative">
                                                                <div className="w-12 h-12 border-4 border-blue-500/20 rounded-full" />
                                                                <div className="absolute top-0 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">Uploading</span>
                                                                <span className="text-[9px] font-semibold text-blue-400 mt-1">Updating profile...</span>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                
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
                                                        <span className="text-6xl sm:text-8xl font-bold text-blue-100 select-none">
                                                         {user?.first_name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || user?.trade_id?.charAt(0).toUpperCase() || 'S'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-blue-600/0 group-hover/profile:bg-blue-600/10 transition-colors duration-500" />
                                            </div>
                                        </div>
                                        
                                        <motion.label 
                                            whileHover={{ scale: 1.1, rotate: 12 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="absolute bottom-1 right-2 w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl border-4 border-white cursor-pointer z-20"
                                        >
                                            <FiCamera className="w-6 h-6" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
                                        </motion.label>

                                        {/* Floating Success Indicator Outside Circle */}
                                        <AnimatePresence>
                                            {uploadSuccess && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl shadow-emerald-500/40 whitespace-nowrap"
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-emerald-500">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Photo Synchronized</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    <motion.div variants={childVariants} className="text-center px-6 mt-8 z-10 w-full">
                                        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-2 capitalize">
                                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.name || user?.full_name || 'Seller Account')}
                                        </h3>
                                    </motion.div>
                                </div>

                                {/* Activity Icons */}
                                <div className="mt-12 mb-10">
                                    <motion.div variants={childVariants} className="flex items-center gap-4 mb-10 px-2">
                                        <div className="w-1.5 h-7 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                                        <h4 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Activity Console</h4>
                                    </motion.div>
                                    <div className="grid grid-cols-3 gap-y-12 gap-x-4">
                                        <OrderStatusIcon icon={FiCreditCard} label="Liquidity" color="text-blue-600" bgColor="bg-blue-50/50 border-blue-100/50" />
                                        <OrderStatusIcon icon={FiTruck} label="Logistics" color="text-indigo-600" bgColor="bg-indigo-50/50 border-indigo-100/50" />
                                        <OrderStatusIcon icon={FiRefreshCw} label="Dynamics" color="text-amber-600" bgColor="bg-amber-50/50 border-amber-100/50" />
                                        <OrderStatusIcon icon={FiXCircle} label="Revoked" color="text-rose-600" bgColor="bg-rose-50/50 border-rose-100/50" />
                                        <OrderStatusIcon icon={FiHeart} label="Loyalty" color="text-emerald-600" bgColor="bg-emerald-50/50 border-emerald-100/50" />
                                        <OrderStatusIcon icon={FiHeadphones} label="Support" color="text-slate-600" bgColor="bg-slate-50/50 border-slate-100/50" />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-12">
                                    <ActionItem icon={FiUser} label="Identity Profile" onClick={onEditProfile} />
                                    <ActionItem icon={FiKey} label="Security Architecture" onClick={onResetPassword} />
                                </div>

                                <div className="pb-12 flex flex-col items-center gap-12 mt-4">
                                    <motion.button
                                        variants={childVariants}
                                        whileHover={{ scale: 1.02, backgroundColor: "#FFF1F2" }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={onLogout}
                                        className="w-full max-w-[340px] flex items-center justify-center gap-4 py-6 text-rose-600 font-bold uppercase tracking-widest text-[11px] bg-white rounded-[2.5rem] border-2 border-rose-50 hover:border-rose-100 transition-all shadow-sm active:scale-95"
                                    >
                                        <FiLogOut className="w-5 h-5" />
                                        Log Out
                                    </motion.button>
                                    
                                    <motion.div variants={childVariants} className="text-center opacity-30 px-10">
                                        <div className="h-px w-20 bg-slate-300 mx-auto mb-6" />
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">BBHC BAZAAR v3.0.0</p>
                                        <p className="text-[8px] font-semibold text-slate-400 mt-2 uppercase tracking-widest">Secured • Cloud Sync</p>
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
