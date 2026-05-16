import { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import { FaDownload } from 'react-icons/fa6'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { createOrder, getProducts } from '../../services/api'
import { setHomeProducts } from '../../store/dataSlice'
import { FaArrowLeft, FaMinus, FaPlus } from 'react-icons/fa6'
import SuccessAnimation from '../../components/SuccessAnimation'

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
  const successQrRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const bookingData = location.state?.booking || null
  const isService = !!bookingData

  const downloadSvgFromRef = (node, filename) => {
    if (!node) return
    const svg = node.querySelector('svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'bbhc-order-qr.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/phone-entry', {
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
      return
    }
    if (userType !== 'user') {
      setError('Only customers can place orders. Please login with a user account.')
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
    } finally {
      setLoading(false)
    }
  }

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
                      <p className="text-sm font-bold text-blue-600 mt-1">
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
                  <li>Collect your product at the BBHCBazaar outlet.</li>
                  <li>Scan the generated QR code at the pickup counter to pay securely.</li>
                  <li>Your Orders will be visible instantly under Menu &gt; Orders .</li>
                </ul>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-8 space-y-5">
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

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-700 text-white font-semibold py-3.5 text-sm uppercase tracking-widest hover:bg-emerald-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Processing...' : 'Confirm purchase'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />

      <AnimatePresence>
        {showSuccess && successOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-[clamp(320px,95vw,480px)] text-center shadow-2xl space-y-6"
            >
              <SuccessAnimation />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Order placed successfully!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Your order is waiting for seller confirmation. You'll receive a QR code once the seller accepts your order.
                </p>
                {successOrder.status === 'pending_seller' && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    Status: Waiting for seller confirmation
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-3">
                {successOrder.status === 'seller_accepted' && successOrder.secureTokenUser && (
                  <>
                    <div
                      className="bg-gray-50 p-4 rounded-2xl border border-gray-200 inline-block"
                      ref={successQrRef}
                    >
                      <QRCode value={successOrder.secureTokenUser || successOrder.qrCodeData || ''} size={160} />
                    </div>
                    <p className="text-xs text-gray-500 font-mono">
                      Token: {successOrder.secureTokenUser}
                    </p>
                    <button
                      onClick={() => downloadSvgFromRef(successQrRef.current, `bbhc-order-${successOrder.orderNumber}.svg`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-black transition"
                    >
                      <FaDownload className="w-4 h-4" />
                      Download QR
                    </button>
                  </>
                )}
                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  Order #{successOrder.orderNumber}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/user/orders')}
                  className="w-full rounded-full border border-gray-900 text-gray-900 font-semibold py-3"
                >
                  View my orders
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false)
                    navigate('/')
                  }}
                  className="w-full rounded-full bg-gray-900 text-white font-semibold py-3"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BuyNow

