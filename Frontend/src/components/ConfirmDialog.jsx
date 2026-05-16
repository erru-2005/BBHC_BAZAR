/**
 * Custom Confirmation Dialog Component using reactjs-popup
 */
import Popup from 'reactjs-popup'
import { motion } from 'framer-motion'
import { FaExclamationTriangle } from 'react-icons/fa'
import { motionVariants, transitions } from '../utils/animations'

function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel', type = 'danger' }) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Popup
      open={open}
      closeOnDocumentClick={false}
      modal
      nested
      contentStyle={{
        padding: '0',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: 'clamp(280px, 90%, 350px)'
      }}
      overlayStyle={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <motion.div
        className="bg-white rounded-2xl overflow-hidden p-8 text-center"
        initial={motionVariants.scaleIn.initial}
        animate={motionVariants.scaleIn.animate}
        exit={motionVariants.scaleIn.exit}
        transition={transitions.spring}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${
            type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
          }`}>
            <FaExclamationTriangle className="w-7 h-7" />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title || 'Confirm Action'}</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed px-2">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <motion.button
            onClick={handleConfirm}
            className={`w-full py-3.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${
              type === 'danger' 
                ? 'bg-red-600 shadow-red-600/20 hover:bg-red-700' 
                : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
          <motion.button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cancelText}
          </motion.button>
        </div>
      </motion.div>
    </Popup>
  )
}

export default ConfirmDialog

