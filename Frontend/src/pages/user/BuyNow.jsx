import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { createOrder, getProducts } from '../../services/api'
import { setHomeProducts } from '../../store/dataSlice'
import { FaArrowLeft, FaMinus, FaPlus } from 'react-icons/fa6'
import SlideToUnlock from '../../components/SlideToUnlock'
import OrderSuccessDialog from '../../components/OrderSuccessDialog'
import { getExpectedDeliveryDate, formatDate } from '../../utils/delivery'

function BuyNow() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const initialProduct = useMemo(() => {
    const fromState = location.state?.product
    if (fromState) return fromState
    return home.products?.find((prod) => String(prod.id || prod._id) === String(productId))
  }, [home.products, location.state, productId])

  const [product, setProduct] = useState(initialProduct)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successOrder, setSuccessOrder] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [slideTriggered, setSlideTriggered] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const bookingData = location.state?.booking || null
  const isService = !!bookingData

  useEffect(() => {
    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/login', {
        replace: true,
        state: {
          returnTo: `/product/${productId}/buy`,
          message: 'Please login to complete your purchase.'
        }
      })
    }
  }, [isAuthenticated, userType, navigate, productId])

  useEffect(() => {
    if (!product) {
      const loadProduct = async () => {
        try {
          const products = await getProducts()
          dispatch(setHomeProducts(products))
          const match = products.find((prod) => String(prod.id || prod._id) === String(productId))
          setProduct(match)
        } catch (err) {
          setError(err.message)
        }
      }
      loadProduct()
    }
  }, [dispatch, product, productId])

  const availableQuantity = useMemo(() => {
    if (!product) return 1
    const raw =
      Number(product.quantity ??
        product.stock ??
        product.available_quantity ??
        product.inventory ??
        0)
    // Since inventory tracking is disabled, return a high number if raw is zero or missing
    if (Number.isNaN(raw) || raw <= 0) {
      return 999
    }
    return raw
  }, [product])

  const isOutOfStock = false
  const total = useMemo(() => {
    if (!product) return 0
    // Use total_selling_price (with commission) if available, otherwise fall back to selling_price
    const price = Number(product.total_selling_price || product.selling_price || product.max_price || product.price || 0)
    return price * quantity
  }, [product, quantity])

  const expectedDeliveryDate = useMemo(() => {
    if (!product || isService) return null
    return product.delivery_promise ? getExpectedDeliveryDate(product.delivery_promise) : null
  }, [product, isService])

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrease = () => {
    if (isService) return
    setQuantity((prev) => Math.min(availableQuantity, prev + 1))
  }

  const handleConfirm = async () => {
    if (!product) {
      setError('Product details are missing.')
      setSlideTriggered(false)
      return
    }
    if (userType !== 'user') {
      setError('Only customers can place orders. Please login with a user account.')
      setSlideTriggered(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        product_id: product.id || product._id,
        quantity: isService ? 1 : quantity,
        booking: bookingData,
        platform: 'web',
        device: navigator.userAgent
      }
      const order = await createOrder(payload)
      setSuccessOrder(order)
      setShowSuccess(true)
    } catch (err) {
      setError(err.message)
      setSlideTriggered(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSlideUnlock = () => {
    if (loading || slideTriggered) return
    setSlideTriggered(true)
    handleConfirm()
  }

  const scheduleLabel = useMemo(() => {
    if (!isService || !bookingData) return null
    if (bookingData.type === 'single') {
      return `On ${new Date(bookingData.startDate).toLocaleDateString()}`
    }
    return `${new Date(bookingData.startDate).toLocaleDateString()} - ${new Date(bookingData.endDate).toLocaleDateString()}`
  }, [isService, bookingData])

  const expectedArrivalDateStr = useMemo(() => {
    if (!product || isService) return ''
    const span = Number(product.delivery_span ?? 2)
    if (isNaN(span) || span < 1) return ''

    let daysToAdd = span - 1
    let currentDate = new Date()

    // If today is Sunday, we move to Monday (Sunday is not counted/cannot be delivery day)
    while (currentDate.getDay() === 0) {
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Add days, skipping Sundays
    while (daysToAdd > 0) {
      currentDate.setDate(currentDate.getDate() + 1)
      if (currentDate.getDay() !== 0) {
        daysToAdd--
      }
    }

    const dd = String(currentDate.getDate()).padStart(2, '0')
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0')
    const yyyy = currentDate.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }, [product, isService])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Loading product details...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50 text-slate-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="max-w-5xl mx-auto space-y-5 px-3 sm:px-4 pb-24 lg:pb-8">
        <button
          onClick={() => navigate(`/product/${productId}`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-full px-4 py-2 hover:bg-emerald-50 transition"
        >
          <FaArrowLeft className="w-4 h-4" /> Back to product
        </button>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            <div className="p-5 sm:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <img
                  src={product.thumbnail}
                  alt={product.product_name}
                  className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Product</p>
                  <h1 className="text-2xl font-semibold mt-1 text-slate-900">{product.product_name}</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {product.categories?.[0] || 'BBHCBazaar Collection'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      {isService ? 'Schedule' : 'Quantity'}
                    </p>
                    {isService ? (
                      <p className="text-sm font-bold text-blue-600 mt-1 whitespace-nowrap">
                        {bookingData.type === 'single' 
                          ? `On ${new Date(bookingData.startDate).toLocaleDateString()}` 
                          : `${new Date(bookingData.startDate).toLocaleDateString()} - ${new Date(bookingData.endDate).toLocaleDateString()}`
                        }
                      </p>
                    ) : null}
                  </div>
                  {!isService && (
                    <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={handleDecrease}
                        className="p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <FaMinus className="w-3 h-3" />
                      </button>
                      <span className="px-4 font-semibold text-lg text-slate-900">{quantity}</span>
                      <button
                        onClick={handleIncrease}
                        className="p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        disabled={quantity >= availableQuantity}
                        aria-label="Increase quantity"
                      >
                        <FaPlus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/60">
                <p className="text-xs uppercase tracking-widest text-emerald-700 mb-2">Order info</p>
                <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                  {expectedDeliveryDate && (
                    <li className="text-emerald-800 font-bold list-none flex items-center gap-2 mb-2 p-2.5 bg-white rounded-xl border border-emerald-200 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                      <span>The order will be delivered on or before <span className="whitespace-nowrap">{formatDate(expectedDeliveryDate)}</span></span>
                    </li>
                  )}
                  <li>Collect your product at the BBHCBazaar outlet.</li>
                  <li>Scan the generated QR code at the pickup counter to pay securely.</li>
                  <li>Your Orders will be visible instantly under Menu &gt; Orders .</li>
                </ul>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-8 space-y-5">
              {expectedArrivalDateStr && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    🚚
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Delivery Timeframe</p>
                    <p className="text-sm text-slate-800 font-semibold mt-0.5">
                      Arriving on or before <span className="font-extrabold text-emerald-900 underline decoration-2 whitespace-nowrap">{expectedArrivalDateStr}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-700">
                  <span>Unit price</span>
                  <span>₹{Number(product.total_selling_price || product.selling_price || product.max_price || 0).toLocaleString('en-IN')}</span>
                </div>
                {product.commission_rate && product.commission_rate > 0 && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Commission ({product.commission_rate}%)</span>
                    <span>₹{Number((product.selling_price * product.commission_rate / 100) || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-700">
                  <span>Quantity</span>
                  <span>{quantity}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-800">Total</span>
                  <span className="text-2xl font-black text-emerald-700">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <SlideToUnlock
                bare
                shimmer
                sliderText="Swipe to confirm purchase"
                onUnlock={handleSlideUnlock}
                unlocked={slideTriggered}
                resetKey={error}
                disabled={loading && !slideTriggered}
                unlockedContent={
                  loading ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                      <p className="text-sm font-semibold text-emerald-800 animate-pulse">
                        Processing your order...
                      </p>
                    </div>
                  ) : null
                }
              />
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />

      <OrderSuccessDialog
        open={showSuccess && !!successOrder}
        productName={product.product_name}
        quantity={quantity}
        amount={total}
        orderNumber={successOrder?.orderNumber}
        status={successOrder?.status}
        isService={isService}
        scheduleLabel={scheduleLabel}
        onViewOrders={() => navigate('/user/orders')}
        onContinueShopping={() => navigate('/')}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default BuyNow

