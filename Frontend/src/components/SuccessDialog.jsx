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
        maxWidth: '420px',
        width: '90%'
      }}
      overlayStyle={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClose={onClose}
    >
      <div className="bg-white rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 text-green-600">
              <FaCheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title || 'Success'}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </Popup>
  )
}

export default SuccessDialog

