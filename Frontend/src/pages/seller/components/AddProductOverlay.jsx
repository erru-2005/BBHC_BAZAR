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
                    borderRadius: "100px",
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
                    borderRadius: "100px",
                    y: 100 
                }}
                className="relative w-full h-[100vh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-[4rem] shadow-[0_60px_100px_-20px_rgba(15,23,42,0.4)] border-t sm:border border-slate-100 overflow-hidden pointer-events-auto flex flex-col"
                transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 28,
                    mass: 1.1
                }}
            >
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-8 border-b border-slate-50 bg-white/60 backdrop-blur-2xl sticky top-0 z-20 gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter font-outfit uppercase">
                                {mode === 'product' ? 'Asset Initializer' : 'Service Deployment'}
                            </h2>
                            <div className="flex gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                <button 
                                    onClick={() => setMode('product')}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'product' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
                                >
                                    Stock
                                </button>
                                <button 
                                    onClick={() => setMode('service')}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'service' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600'}`}
                                >
                                    Expertise
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-80">
                            {mode === 'product' ? 'PROVISIONING NEW INVENTORY PROTOCOLS' : 'ESTABLISHING CLIENT SERVICE PIPELINES'}
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
