import { AnimatePresence, motion } from 'framer-motion'
import { FaCheck, FaExclamation, FaXmark } from 'react-icons/fa6'
import PropTypes from 'prop-types'
import { useEffect } from 'react'

const toastVariants = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 }
}

const Toast = ({ message, isVisible, onClose, type = 'success', duration = 3000 }) => {
    useEffect(() => {
        if (isVisible && duration) {
            const timer = setTimeout(() => {
                onClose()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [isVisible, duration, onClose])

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
                    <motion.div
                        variants={toastVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border outline-none
              ${type === 'success'
                                ? 'bg-white/90 border-green-100 text-slate-800'
                                : 'bg-white/90 border-red-100 text-slate-800'
                            }
            `}
                    >
                        <div className={`
              flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0
              ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
            `}>
                            {type === 'success' ? <FaCheck size={14} /> : <FaExclamation size={14} />}
                        </div>

                        <p className="text-sm font-semibold pr-2">{message}</p>

                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors ml-2"
                        >
                            <FaXmark size={14} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

Toast.propTypes = {
    message: PropTypes.string.isRequired,
    isVisible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['success', 'error']),
    duration: PropTypes.number
}

export default Toast
