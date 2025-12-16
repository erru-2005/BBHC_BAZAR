import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileBottomNav from './components/MobileBottomNav'
import MobileSearchBar from './components/MobileSearchBar'
import { getBag, updateBagItem, removeFromBag, createOrder, clearBag } from '../../services/api'
import { FaTrash } from 'react-icons/fa6'
import { FaMinus, FaPlus } from 'react-icons/fa'

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function Bag() {
  const navigate = useNavigate()
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)
  const [bagItems, setBagItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [createdOrders, setCreatedOrders] = useState([])
  const [failedItems, setFailedItems] = useState([])
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/phone-entry', {
        state: {
          returnTo: '/user/bag',
          message: 'Please login to view your bag.'
        }
      })
      return
    }

    loadBag()
  }, [isAuthenticated, userType, navigate])

  const loadBag = async () => {
    try {
      setLoading(true)
      const items = await getBag()
      setBagItems(items)
    } catch (error) {
      console.error('Failed to load bag:', error)
      alert(error.message || 'Failed to load bag')
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = async (bagItemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(bagItemId)
      return
    }

    // Optimistic update - update UI immediately
    setBagItems(prevItems => 
      prevItems.map(item => 
        item.id === bagItemId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    )

    // Update backend silently in background
    try {
      await updateBagItem(bagItemId, newQuantity)
    } catch (error) {
      // Revert on error
      loadBag()
      console.error('Failed to update quantity:', error)
    }
  }

  const handleRemoveItem = async (bagItemId) => {
    if (!confirm('Are you sure you want to remove this item from your bag?')) {
      return
    }

    // Optimistic update - remove from UI immediately
    setBagItems(prevItems => prevItems.filter(item => item.id !== bagItemId))

    // Update backend silently in background
    try {
      await removeFromBag(bagItemId)
    } catch (error) {
      // Revert on error
      loadBag()
      alert(error.message || 'Failed to remove item')
    }
  }

  // Calculate totals
  const subtotal = bagItems.reduce((sum, item) => {
    // Use total_selling_price (with commission) if available, otherwise fall back to selling_price
    const price = Number(item.product?.total_selling_price || item.product?.selling_price || item.product?.max_price || 0)
    return sum + (price * item.quantity)
  }, 0)

  const deliveryFee = subtotal > 500 ? 0 : 15 // Free delivery over ₹500
  const total = subtotal + deliveryFee

  // Handle checkout - create orders for all bag items
  const handleCheckout = async () => {
    if (bagItems.length === 0) {
      alert('Your bag is empty')
      return
    }

    setCheckoutLoading(true)
    setCheckoutError(null)
    setCreatedOrders([])
    setFailedItems([])

    const orders = []
    const failed = []
    const successfulBagItemIds = [] // Track which bag items were successfully ordered

    try {
      // Create an order for each bag item
      for (const item of bagItems) {
        const product = item.product || {}
        const productId = product.id || product._id

        if (!productId) {
          failed.push({
            item,
            error: 'Product ID is missing'
          })
          continue
        }

        try {
          const orderPayload = {
            product_id: productId,
            quantity: item.quantity,
            platform: 'web',
            device: navigator.userAgent,
            source: 'bag_checkout'
          }

          const order = await createOrder(orderPayload)
          orders.push(order)
          // Track successful bag item
          successfulBagItemIds.push(item.id)
        } catch (error) {
          failed.push({
            item,
            error: error.message || 'Failed to create order'
          })
        }
      }

      // If at least one order was created successfully, remove those items from bag
      if (successfulBagItemIds.length > 0) {
        try {
          if (failed.length === 0) {
            // All items succeeded, clear entire bag
            await clearBag()
            setBagItems([])
          } else {
            // Only remove successful items from bag
            for (const bagItemId of successfulBagItemIds) {
              try {
                await removeFromBag(bagItemId)
              } catch (err) {
                console.error('Failed to remove item from bag:', err)
              }
            }
            // Reload bag to reflect changes
            await loadBag()
          }
        } catch (error) {
          console.error('Failed to clear bag:', error)
          // Don't fail checkout if bag clearing fails
        }
      }

      // Set results
      setCreatedOrders(orders)
      setFailedItems(failed)

      if (orders.length > 0) {
        setCheckoutSuccess(true)
      } else {
        setCheckoutError('Failed to create orders for all items. Please try again.')
      }
    } catch (error) {
      setCheckoutError(error.message || 'An error occurred during checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Skeleton loading component
  const BagSkeleton = () => (
    <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-shrink-0">
                <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-12 h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="ml-auto h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-3 mb-6">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-full bg-gray-200 rounded animate-pulse mt-3"></div>
          </div>
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-16">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Shopping Bag</h1>

        {loading ? (
          <BagSkeleton />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Cart Items - Left Side (2 columns on large screens) */}
            <div className="lg:col-span-2 space-y-4">
            {bagItems.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600 text-lg mb-4">Your bag is empty</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              bagItems.map((item) => {
                const product = item.product || {}
                // Use total_selling_price (with commission) if available, otherwise fall back to selling_price
                const price = Number(product.total_selling_price || product.selling_price || product.max_price || 0)
                const maxPrice = Number(product.max_price || product.total_selling_price || product.selling_price || 0)
                const itemTotal = price * item.quantity

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={product.thumbnail || '/placeholder.png'}
                          alt={product.product_name}
                          className="w-full sm:w-32 h-32 object-contain rounded-lg bg-gray-50 border border-gray-200"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {product.product_name || 'Product'}
                        </h3>
                        
                        {(item.selected_size || item.selected_color) && (
                          <p className="text-sm text-gray-600 mb-2">
                            {item.selected_size && `Size: ${item.selected_size}`}
                            {item.selected_size && item.selected_color && ' / '}
                            {item.selected_color && `Color: ${item.selected_color}`}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(price)}</span>
                          {maxPrice > price && (
                            <span className="text-sm text-gray-500 line-through">{formatCurrency(maxPrice)}</span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              <FaMinus className="w-3 h-3" />
                            </button>
                            <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100 transition"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            aria-label="Remove item"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>

                          <div className="ml-auto">
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(itemTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Order Summary - Right Side (1 column on large screens) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 border border-gray-200 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  <span className="font-medium">
                    {deliveryFee === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatCurrency(deliveryFee)
                    )}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  if (bagItems.length === 0) {
                    alert('Your bag is empty')
                    return
                  }
                  setShowCheckoutConfirm(true)
                }}
                disabled={bagItems.length === 0 || checkoutLoading}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                Go to Checkout
                <span>→</span>
                  </>
                )}
              </button>

              {checkoutError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {checkoutError}
                </div>
              )}
            </div>
          </div>
          </div>
        )}
      </main>

      <MobileBottomNav items={home.bottomNavItems} />

      {/* Checkout Confirmation Modal */}
      <AnimatePresence>
        {showCheckoutConfirm && (
          <CheckoutConfirmModal
            bagItems={bagItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            onConfirm={() => {
              setShowCheckoutConfirm(false)
              handleCheckout()
            }}
            onCancel={() => setShowCheckoutConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Checkout Success Modal */}
      <AnimatePresence>
        {checkoutSuccess && (
          <CheckoutSuccessModal
            orders={createdOrders}
            failedItems={failedItems}
            onClose={() => {
              setCheckoutSuccess(false)
              setCreatedOrders([])
              setFailedItems([])
              if (createdOrders.length > 0) {
                navigate('/user/orders')
              }
            }}
            onContinueShopping={() => {
              setCheckoutSuccess(false)
              setCreatedOrders([])
              setFailedItems([])
              navigate('/')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Checkout Confirmation Modal Component
function CheckoutConfirmModal({ bagItems, subtotal, deliveryFee, total, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Purchase</h2>
        <p className="text-gray-600 mb-6">
          You are about to purchase <strong>{bagItems.length}</strong> item{bagItems.length !== 1 ? 's' : ''} from your bag.
        </p>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <span>Delivery Fee</span>
            <span className="font-medium">
              {deliveryFee === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatCurrency(deliveryFee)
              )}
            </span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-48 overflow-y-auto mb-6 space-y-2">
          {bagItems.map((item) => {
            const product = item.product || {}
            // Use total_selling_price (with commission) if available, otherwise fall back to selling_price
            const price = Number(product.total_selling_price || product.selling_price || product.max_price || 0)
            const itemTotal = price * item.quantity
            return (
              <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                <img
                  src={product.thumbnail || '/placeholder.png'}
                  alt={product.product_name}
                  className="w-12 h-12 object-contain rounded bg-gray-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.product_name || 'Product'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Qty: {item.quantity} × {formatCurrency(price)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(itemTotal)}
                </p>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
          >
            Confirm Purchase
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Checkout Success Modal Component
function CheckoutSuccessModal({ orders, failedItems, onClose, onContinueShopping }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-center shadow-2xl space-y-6"
      >
        <SuccessAnimation />
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {orders.length === 1 ? 'Order placed successfully!' : `${orders.length} orders placed successfully!`}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {orders.length === 1 
              ? "Your order is waiting for seller confirmation. You'll receive a QR code once the seller accepts your order."
              : "Your orders are waiting for seller confirmation. You'll receive QR codes once sellers accept your orders."
            }
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {orders.map((order, index) => (
            <div
              key={order.id || index}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Order #{order.orderNumber || order.id}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {order.product_snapshot?.name || 'Product'} × {order.quantity}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    ₹{Number(order.total_amount || order.totalAmount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                {order.status === 'seller_accepted' && order.secureTokenUser && (
                  <div className="flex-shrink-0">
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="2" fill="#111827"/>
                        <path d="M7 7h10v10H7z" fill="white"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              {order.status === 'pending_seller' && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  Status: Waiting for seller confirmation
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Failed Items Warning */}
        {failedItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-yellow-900 mb-2">
              ⚠️ {failedItems.length} item(s) could not be ordered:
            </p>
            <ul className="text-xs text-yellow-800 space-y-1">
              {failedItems.map((failed, index) => (
                <li key={index}>
                  • {failed.item.product?.product_name || 'Product'}: {failed.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onContinueShopping}
            className="w-full rounded-full border border-gray-900 text-gray-900 font-semibold py-3 hover:bg-gray-50 transition"
          >
            Continue Shopping
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-full bg-gray-900 text-white font-semibold py-3 hover:bg-gray-800 transition"
          >
            View My Orders
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Success Animation Component
function SuccessAnimation() {
  const confetti = Array.from({ length: 12 })
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl"
      >
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="text-4xl text-white font-black"
        >
          ✓
        </motion.span>
      </motion.div>
      {confetti.map((_, index) => (
        <motion.span
          key={index}
          className="absolute w-2 h-2 rounded-full bg-emerald-400"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 1],
            x: Math.cos((index / confetti.length) * Math.PI * 2) * 80,
            y: Math.sin((index / confetti.length) * Math.PI * 2) * 80
          }}
          transition={{ duration: 1.2, delay: 0.2 + index * 0.02, repeat: Infinity, repeatDelay: 1.5 }}
        />
      ))}
    </div>
  )
}

export default Bag

