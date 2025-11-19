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
        maxWidth: '420px',
        width: '90%'
      }}
      overlayStyle={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <motion.div
        className="bg-white rounded-xl overflow-hidden"
        initial={motionVariants.scaleIn.initial}
        animate={motionVariants.scaleIn.animate}
        exit={motionVariants.scaleIn.exit}
        transition={transitions.spring}
      >
        {/* Header */}
        <motion.div
          className={`px-6 py-4 ${type === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.smooth, delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...transitions.spring, delay: 0.2 }}
            >
              <FaExclamationTriangle className="w-5 h-5" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900">{title || 'Confirm Action'}</h3>
          </div>
        </motion.div>

        {/* Body */}
        <motion.div
          className="px-6 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...transitions.smooth, delay: 0.2 }}
        >
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.smooth, delay: 0.3 }}
        >
          <motion.button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {cancelText}
          </motion.button>
          <motion.button
            onClick={handleConfirm}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {confirmText}
          </motion.button>
        </motion.div>
      </motion.div>
    </Popup>
  )
}

export default ConfirmDialog

