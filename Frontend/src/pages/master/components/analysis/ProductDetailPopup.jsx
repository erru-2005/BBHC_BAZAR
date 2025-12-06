/**
 * Product Detail Popup Component
 * Reusable popup for displaying product details
 */
import { motion } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'

const ProductDetailPopup = ({ product, onClose }) => {
  if (!product) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Product Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl transition-colors"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Product Image */}
        {product.thumbnail && (
          <img
            src={product.thumbnail}
            alt={product.name || product.product_name || 'Product'}
            className="w-full h-40 sm:h-48 object-cover rounded-lg mb-4"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'
            }}
          />
        )}

        {/* Product Details */}
        <div className="space-y-3 sm:space-y-4">
          {product.product_id && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Product ID</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 break-all">
                {product.product_id}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Product Name</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {product.name || product.product_name || 'Unknown Product'}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Seller Name</p>
            <p className="text-base sm:text-lg text-gray-900">
              {product.seller_name || product.seller || 'Unknown'}
            </p>
          </div>

          {(product.stock !== undefined || product.quantity !== undefined) && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Quantity (Stock)</p>
              <p className={`text-base sm:text-lg font-semibold ${
                (product.stock || product.quantity) === 0 ? 'text-red-600' :
                (product.stock || product.quantity) < 10 ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {(product.stock || product.quantity)} units
                {(product.stock || product.quantity) === 0 && ' ⚠️ Out of Stock'}
                {(product.stock || product.quantity) > 0 && (product.stock || product.quantity) < 10 && ' ⚠️ Low Stock'}
              </p>
            </div>
          )}

          {product.selling_price && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Selling Price</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">
                ₹{product.selling_price.toLocaleString()}
              </p>
            </div>
          )}

          {product.rating !== undefined && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {product.rating.toFixed(1)} ⭐
                </p>
                {product.rating_count && (
                  <p className="text-xs sm:text-sm text-gray-500">
                    ({product.rating_count} reviews)
                  </p>
                )}
              </div>
            </div>
          )}

          {product.specification && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Specification</p>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words">
                {product.specification}
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-4 sm:mt-6 w-full bg-blue-500 text-white py-2 sm:py-2.5 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium"
        >
          Close
        </button>
      </motion.div>
    </div>
  )
}

export default ProductDetailPopup

