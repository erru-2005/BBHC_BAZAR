import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiLogOut, FiKey, FiUser, FiChevronRight } from 'react-icons/fi'
import { useEffect } from 'react'

function SellerProfile({ isOpen, onClose, user, onLogout, onResetPassword, onEditProfile }) {

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            // Simulate haptic feedback on open
            if (navigator.vibrate) navigator.vibrate(10)
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } }
    }

    // Flagship spring physics
    const sheetVariants = {
        hidden: { y: '100%', scale: 0.92, opacity: 0 },
        visible: {
            y: 0,
            scale: 1,
            opacity: 1,
            transition: {
                type: 'spring',
                damping: 32,
                stiffness: 350,
                mass: 0.8,
                staggerChildren: 0.08,
                delayChildren: 0.05
            }
        },
        exit: {
            y: '100%',
            scale: 0.96,
            opacity: 0,
            transition: {
                type: 'spring',
                damping: 30,
                stiffness: 280
            }
        }
    }

    const childVariants = {
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: 'spring', stiffness: 400, damping: 25 }
        }
    }

    const ActionButton = ({ icon: Icon, label, onClick, colorClass, bgClass, delay }) => (
        <motion.button
            variants={childVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5)
                onClick()
            }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 transition-all group relative overflow-hidden ${bgClass} ${colorClass}`}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-2.5 rounded-xl ${colorClass.replace('text-', 'bg-').replace('300', '500').replace('200', '500')}/10 ring-1 ring-white/5`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-[15px]">{label}</span>
            </div>
            <FiChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-current" />
        </motion.button>
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-[#000000]/60 backdrop-blur-md"
                        style={{ background: 'radial-gradient(circle at center bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)' }}
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={onClose}
                    />

                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col items-center justify-end pointer-events-none"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <motion.div
                            className="w-full bg-[#0f1218] rounded-t-[32px] overflow-hidden shadow-2xl shadow-black ring-1 ring-white/10 pointer-events-auto relative safe-area-bottom"
                            variants={sheetVariants}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.08}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 400) onClose()
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxHeight: '90vh' }}
                        >
                            {/* Drag Indicator */}
                            <div className="flex justify-center pt-4 pb-2 w-full" onClick={onClose}>
                                <div className="h-1.5 w-10 rounded-full bg-white/20" />
                            </div>

                            <div className="px-6 pb-8 pt-1">
                                {/* Header Row */}
                                <motion.div variants={childVariants} className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Profile</h2>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-2 -mr-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <FiX className="w-6 h-6" strokeWidth={2.5} />
                                    </motion.button>
                                </motion.div>

                                {/* Avatar Card - Morph Target */}
                                <motion.div
                                    layoutId="profile-morph-source"
                                    className="relative overflow-hidden mb-6 p-5 rounded-3xl bg-[#1a1f2e] border border-white/5 shadow-lg group"
                                >
                                    {/* Gradient background for flair */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-indigo-500/10 opacity-50" />

                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="relative">
                                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-white shadow-xl shadow-rose-900/40 ring-2 ring-white/10">
                                                <span className="text-2xl font-bold">
                                                    {user?.trade_id?.charAt(0).toUpperCase() || 'S'}
                                                </span>
                                            </div>
                                            {/* Online indicator */}
                                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[#1a1f2e]" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-white tracking-tight truncate">
                                                {user?.trade_id || 'Seller'}
                                            </h3>
                                            <p className="text-sm font-bold text-slate-300 truncate">Seller Dashboard</p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Actions */}
                                <div className="space-y-3">
                                    <ActionButton
                                        icon={FiUser}
                                        label="Edit Profile"
                                        onClick={onEditProfile}
                                        colorClass="text-blue-400"
                                        bgClass="bg-[#1a1f2e] hover:bg-[#202538]"
                                    />
                                    <ActionButton
                                        icon={FiKey}
                                        label="Change Password"
                                        onClick={onResetPassword}
                                        colorClass="text-purple-400"
                                        bgClass="bg-[#1a1f2e] hover:bg-[#202538]"
                                    />
                                    <ActionButton
                                        icon={FiLogOut}
                                        label="Sign Out"
                                        onClick={onLogout}
                                        colorClass="text-rose-400"
                                        bgClass="bg-rose-950/20 border-rose-500/10 hover:bg-rose-950/30"
                                    />
                                </div>

                                <motion.div variants={childVariants} className="mt-8 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">BBHC Bazaar Seller App v1.0.0</p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default SellerProfile
