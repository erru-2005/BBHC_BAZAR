import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import SellerProductForm from './ProductForm'
import ServiceForm from './ServiceForm'
import { useEffect, useState } from 'react'

export default function AddProductOverlay({ isOpen, onClose }) {
    const [mode, setMode] = useState('product') // 'product' or 'service'
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
                initial={{ 
                    scale: 0.1, 
                    opacity: 0, 
                    borderRadius: "9999px",
                    y: 100 
                }}
                animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    borderRadius: "3rem",
                    y: 0 
                }}
                exit={{ 
                    scale: 0.1, 
                    opacity: 0, 
                    borderRadius: "9999px",
                    y: 100 
                }}
                className="relative w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-[3.5rem] shadow-[0_80px_120px_-30px_rgba(15,23,42,0.5)] border-t sm:border border-slate-100 overflow-hidden pointer-events-auto flex flex-col"
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 30,
                    mass: 1.2
                }}
            >
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-10 sm:py-10 border-b border-slate-100 bg-white/40 backdrop-blur-3xl sticky top-0 z-20 gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter font-outfit uppercase">
                                {mode === 'product' ? 'New Product' : 'New Service'}
                            </h2>
                            <div className="flex gap-2 p-2 bg-slate-100 rounded-[1.5rem] border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                                <button 
                                    onClick={() => setMode('product')}
                                    className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${mode === 'product' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Products
                                </button>
                                <button 
                                    onClick={() => setMode('service')}
                                    className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${mode === 'service' ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-600 hover:text-blue-700'}`}
                                >
                                    Services
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em] opacity-90">
                            {mode === 'product' ? 'REGISTERING NEW INVENTORY TO MARKET' : 'INTRODUCING NEW SERVICE OFFERING'}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ rotate: 180, scale: 1.1, backgroundColor: "#F1F5F9" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="p-3.5 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 transition-all shadow-sm self-end sm:self-center"
                    >
                        <FiX className="w-5 h-5" strokeWidth={3} />
                    </motion.button>
                </motion.div>

                {/* Content Area - Scrollable */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="flex-1 overflow-y-auto no-scrollbar scroll-smooth"
                >
                    <div className="p-6 md:p-10 lg:p-12">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            {mode === 'product' ? (
                                <SellerProductForm onClose={onClose} />
                            ) : (
                                <ServiceForm />
                            )}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Bottom Handle (Mobile) */}
                <div className="h-6 w-full flex justify-center items-center bg-white border-t border-slate-50 sm:hidden">
                    <div className="w-16 h-1.5 rounded-full bg-slate-200" />
                </div>
            </motion.div>
        </div>
    )
}
