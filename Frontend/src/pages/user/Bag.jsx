import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileBottomNav from './components/MobileBottomNav'
import MobileSearchBar from './components/MobileSearchBar'
import { getBag, updateBagItem, removeFromBag } from '../../services/api'
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
    const price = Number(item.product?.selling_price || item.product?.max_price || 0)
    return sum + (price * item.quantity)
  }, 0)

  const deliveryFee = subtotal > 500 ? 0 : 15 // Free delivery over ₹500
  const total = subtotal + deliveryFee

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
                const price = Number(product.selling_price || product.max_price || 0)
                const maxPrice = Number(product.max_price || product.selling_price || 0)
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
                  // Navigate to checkout (you can implement this later)
                  alert('Checkout functionality coming soon!')
                }}
                disabled={bagItems.length === 0}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Go to Checkout
                <span>→</span>
              </button>
            </div>
          </div>
          </div>
        )}
      </main>

      <MobileBottomNav items={home.bottomNavItems} />
    </div>
  )
}

export default Bag

