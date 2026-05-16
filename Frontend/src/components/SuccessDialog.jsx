/**
 * Success Dialog Component using reactjs-popup
 */
import Popup from 'reactjs-popup'
import { FaCheckCircle } from 'react-icons/fa'

function SuccessDialog({ open, onClose, title, message }) {
  return (
    <Popup
      open={open}
      closeOnDocumentClick={true}
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
      onClose={onClose}
    >
      <div className="bg-white rounded-2xl overflow-hidden p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center shadow-inner">
            <FaCheckCircle className="w-7 h-7" />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title || 'Success'}</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Action */}
        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95"
        >
          CONTINUE
        </button>
      </div>
    </Popup>
  )
}

export default SuccessDialog

