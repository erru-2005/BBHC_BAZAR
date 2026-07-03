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
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
            {/* Backdrop Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-xl pointer-events-auto"
            />

            {/* Bottom Drawer Container */}
            <motion.div
                initial={{ 
                    y: "100%", 
                    opacity: 0.8 
                }}
                animate={{ 
                    y: 0, 
                    opacity: 1 
                }}
                exit={{ 
                    y: "100%", 
                    opacity: 0.8 
                }}
                className="relative w-full max-w-5xl h-[85vh] bg-white rounded-t-[4px] shadow-[0_-20px_50px_rgba(15,23,42,0.25)] border-t border-x border-slate-100 overflow-hidden pointer-events-auto flex flex-col"
                transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 28
                }}
            >
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-10 sm:py-10 border-b border-slate-100 bg-white/40 backdrop-blur-3xl sticky top-0 z-20 gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                {mode === 'product' ? 'New Product' : 'New Service'}
                            </h2>
                            <div className="flex gap-2 p-2 bg-slate-100 rounded-[4px] border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                                <button 
                                    onClick={() => setMode('product')}
                                    className={`px-6 py-2.5 rounded-[2px] text-[11px] font-bold tracking-widest uppercase transition-all duration-300 ${mode === 'product' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Products
                                </button>
                                <button 
                                    onClick={() => setMode('service')}
                                    className={`px-6 py-2.5 rounded-[2px] text-[11px] font-bold tracking-widest uppercase transition-all duration-300 ${mode === 'service' ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-600 hover:text-blue-700'}`}
                                >
                                    Services
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest opacity-90">
                            {mode === 'product' ? 'Registering new inventory' : 'Introducing new service offering'}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ rotate: 180, scale: 1.1, backgroundColor: "#F1F5F9" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="p-3.5 rounded-[2px] bg-white border border-slate-100 text-slate-400 hover:text-slate-900 transition-all shadow-sm self-end sm:self-center"
                    >
                        <FiX className="w-5 h-5" strokeWidth={3} />
                    </motion.button>
                </motion.div>

                {/* Content Area - Scrollable */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
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
                                <ServiceForm onClose={onClose} />
                            )}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Bottom Handle (Mobile) */}
                <div className="h-6 w-full flex justify-center items-center bg-white border-t border-slate-50 sm:hidden">
                    <div className="w-16 h-1 rounded-[1px] bg-slate-200" />
                </div>
            </motion.div>
        </div>
    )
}
