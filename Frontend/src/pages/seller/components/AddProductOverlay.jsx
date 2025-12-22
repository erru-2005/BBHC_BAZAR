import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import SellerProductForm from './ProductForm'
import { useEffect } from 'react'

export default function AddProductOverlay({ isOpen, onClose }) {
    // Lock body scroll when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-xl pointer-events-auto"
            />

            {/* The Blooming Card */}
            <motion.div
                layoutId="add-product-fab"
                className="relative w-full h-[92vh] sm:h-auto sm:max-w-2xl sm:max-h-[85vh] bg-[#0f172a] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border-t sm:border border-white/10 overflow-hidden pointer-events-auto flex flex-col"
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 1
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-20">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-bold text-white"
                        >
                            Add Product
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-xs font-bold text-slate-300"
                        >
                            Create a new listing for your store
                        </motion.p>
                    </div>
                    <motion.button
                        whileHover={{ rotate: 90, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors"
                    >
                        <FiX className="w-6 h-6" strokeWidth={2.5} />
                    </motion.button>
                </div>

                {/* Content Area - Scrollable */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 overflow-y-auto no-scrollbar p-6"
                >
                    <SellerProductForm onClose={onClose} />
                </motion.div>

                {/* Bottom Handle (Mobile) */}
                <div className="h-2 w-full flex justify-center py-4 bg-[#0f172a] sm:hidden">
                    <div className="w-12 h-1.5 rounded-full bg-white/10" />
                </div>
            </motion.div>
        </div>
    )
}
