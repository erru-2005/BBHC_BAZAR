import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { 
  FaArrowLeft, 
  FaBox, 
  FaClock, 
  FaTruck, 
  FaDownload, 
  FaCopy, 
  FaQrcode, 
  FaCircleInfo, 
  FaCircleCheck, 
  FaCircleXmark,
  FaStore,
  FaCalendarDays,
  FaStar
} from 'react-icons/fa6'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileBottomNav from './components/MobileBottomNav'
import { getOrder, cancelOrder, createOrUpdateRating, getMyRating } from '../../services/api'
import { getSocket } from '../../utils/socket'

const calculateArrivalDate = (createdAt, deliverySpan) => {
  if (!createdAt) return ''
  const span = Number(deliverySpan ?? 2)
  if (isNaN(span) || span < 1) return ''

  let daysToAdd = span - 1
  let currentDate = new Date(createdAt)

  // If today is Sunday, move to Monday (Sunday is not counted)
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
}

const getStatusAttributes = (status) => {
  switch (status) {
    case 'completed':
      return {
        Icon: FaCircleCheck,
        iconClassName: 'text-green-500 bg-green-50',
        lineClassName: 'bg-green-500'
      }
    case 'active':
      return {
        Icon: FaClock,
        iconClassName: 'text-blue-500 bg-blue-50 animate-pulse',
        lineClassName: 'bg-blue-200'
      }
    case 'error':
      return {
        Icon: FaCircleXmark,
        iconClassName: 'text-red-500 bg-red-50',
        lineClassName: 'bg-red-200'
      }
    case 'pending':
    default:
      return {
        Icon: FaBox,
        iconClassName: 'text-slate-300 bg-slate-50',
        lineClassName: 'bg-slate-200'
      }
  }
}

const getStatusTime = (order, targetStatus) => {
  const history = order.statusHistory || []
  const entry = history.find(h => h.status === targetStatus)
  if (entry && entry.timestamp) {
    const d = new Date(entry.timestamp)
    const datePart = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${datePart} at ${timePart}`
  }
  if (targetStatus === 'pending_seller' && order.createdAt) {
    const d = new Date(order.createdAt)
    const datePart = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${datePart} at ${timePart}`
  }
  return null
}

const getOrderSteps = (order) => {
  const status = order.status || 'pending_seller'
  const isService = order.booking || order.type === 'service'

  if (isService) {
    return [
      {
        title: 'Service Booked',
        description: 'Booking request submitted.',
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
        status: 'completed'
      },
      {
        title: 'Confirmation',
        description: status === 'completed' ? 'Booking completed successfully.' : 'Awaiting booking confirmation.',
        status: status === 'completed' ? 'completed' : 'active'
      }
    ]
  }

  const isRejected = ['seller_rejected', 'rejected'].includes(status)
  const isCancelled = ['cancelled', 'cancelled_master'].includes(status)

  const steps = [
    {
      title: 'Order Placed',
      description: 'Your order has been recorded.',
      date: getStatusTime(order, 'pending_seller'),
      status: 'completed'
    }
  ]

  if (isRejected) {
    steps.push({
      title: 'Order Rejected',
      description: order.rejectionReason || order.rejection_reason || 'Seller could not fulfill this order.',
      status: 'error'
    })
    return steps
  }

  if (isCancelled) {
    steps.push({
      title: 'Order Cancelled',
      description: 'This order was cancelled.',
      status: 'error'
    })
    return steps
  }

  // Step 2: Order Confirmed
  let step2Status = 'pending'
  let step2Desc = 'Awaiting seller confirmation.'
  if (status === 'pending_seller') {
    step2Status = 'active'
    step2Desc = 'Seller is reviewing your order.'
  } else if (['seller_accepted', 'handed_over', 'completed'].includes(status)) {
    step2Status = 'completed'
    step2Desc = 'Seller accepted your order.'
  }
  steps.push({
    title: 'Order Confirmed',
    description: step2Desc,
    date: getStatusTime(order, 'seller_accepted'),
    status: step2Status
  })

  // Step 3: Out for Delivery
  let step3Status = 'pending'
  let step3Desc = 'Awaiting dispatch to outlet.'
  if (status === 'seller_accepted') {
    step3Status = 'active'
    step3Desc = 'Product is being sent to the outlet.'
  } else if (['handed_over', 'completed'].includes(status)) {
    step3Status = 'completed'
    step3Desc = 'Product is out for delivery/at the outlet.'
  }
  steps.push({
    title: 'Out for Delivery',
    description: step3Desc,
    date: getStatusTime(order, 'handed_over'),
    status: step3Status
  })

  // Step 4: Delivered
  let step4Status = 'pending'
  let step4Desc = 'Awaiting delivery/collection at the outlet.'
  if (status === 'handed_over') {
    step4Status = 'active'
    step4Desc = 'Ready for pickup! Please collect at outlet counter.'
  } else if (status === 'completed') {
    step4Status = 'completed'
    step4Desc = 'Product delivered to user.'
  }
  steps.push({
    title: 'Delivered',
    description: step4Desc,
    date: getStatusTime(order, 'completed'),
    status: step4Status
  })

  return steps
}

function UserOrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canceling, setCanceling] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrPreviewRef = useRef(null)

  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [hasRated, setHasRated] = useState(false)
  const [editCount, setEditCount] = useState(0)

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const data = await getOrder(orderId)
      setOrder(data)
      
      // Fetch user's rating if order is completed
      if (data.status === 'completed') {
        // order.to_dict() puts the snapshot under 'product' key (not 'product_snapshot')
        // and the ID is stored as 'id', not '_id'. 'product_id' is always a direct field.
        const productId =
          data.product_id ||
          data.product?.id ||
          data.product?._id ||
          data.booking?.service_id ||
          data.service_id
        if (productId) {
          try {
            const ratingRes = await getMyRating(productId)
            if (ratingRes) {
              setRating(ratingRes.rating)
              setReviewText(ratingRes.review_text || '')
              setEditCount(ratingRes.edit_count || 0)
              setHasRated(true)
            }
          } catch (e) {
            console.error('Failed to fetch rating', e)
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()
  }, [orderId])

  // Setup socket connection for real-time order updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !token || !orderId) return

    const handleOrderUpdated = (orderData) => {
      if (orderData.id === orderId || orderData._id === orderId) {
        setOrder(orderData)
      }
    }

    socket.on('order_updated', handleOrderUpdated)
    return () => {
      socket.off('order_updated', handleOrderUpdated)
    }
  }, [orderId, token])

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        setCanceling(true)
        await cancelOrder(orderId)
        fetchOrderDetails()
      } catch (err) {
        alert(err.message)
      } finally {
        setCanceling(false)
      }
    }
  }

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setReviewMessage('Please select a star rating.')
      return
    }
    // order.to_dict() stores the product snapshot under 'product' (not 'product_snapshot')
    // with the ID as 'id'. 'product_id' is always present as a direct top-level field.
    const productId =
      order?.product_id ||
      order?.product?.id ||
      order?.product?._id ||
      order?.booking?.service_id ||
      order?.service_id
    if (!productId) {
      setReviewMessage('Could not identify the item to review.')
      return
    }

    try {
      setIsSubmittingReview(true)
      setReviewMessage('')
      await createOrUpdateRating(productId, rating, reviewText)
      setReviewMessage('Review saved successfully!')
      setHasRated(true)
      if (hasRated) {
        setEditCount((prev) => prev + 1)
      }
    } catch (e) {
      setReviewMessage(e.message || 'Failed to save review.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const copyToken = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadActiveOrderQR = () => {
    if (!qrPreviewRef.current || !order) return
    const svg = qrPreviewRef.current.querySelector('svg')
    if (!svg) return

    const svgString = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const context = canvas.getContext('2d')
      
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, 400, 400)
      context.drawImage(image, 50, 50, 300, 300)

      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `bbhc-order-${order.orderNumber}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobURL)
    }
    image.onerror = () => {
      URL.revokeObjectURL(blobURL)
    }
    image.src = blobURL
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <MainHeader onOpenMenu={() => setMobileMenuOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading order details...</p>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <MainHeader onOpenMenu={() => setMobileMenuOpen(true)} />
        <div className="flex-1 max-w-md mx-auto px-4 py-12 flex flex-col justify-center text-center">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <FaCircleXmark className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Failed to load order</h3>
            <p className="text-sm text-slate-600">{error || 'Order details not found.'}</p>
            <button
              onClick={() => navigate('/user/orders')}
              className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
            >
              Back to Orders
            </button>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  const productName = order.product?.name || order.product?.product_name || 'Product'
  const productImg = order.product?.thumbnail || order.product?.image
  const unitPrice = order.unitPrice || order.unit_price || 0
  const totalAmount = order.totalAmount || order.total_amount || 0
  const isService = order.booking || order.type === 'service'
  const steps = getOrderSteps(order)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 pb-24 lg:pb-6">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)} />
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Product Details Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 shadow-inner">
              {productImg ? (
                <img src={productImg} alt={productName} className="w-full h-full object-cover" />
              ) : (
                <FaBox className="w-8 h-8 opacity-20 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                isService ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
              }`}>
                {isService ? 'Service' : 'Product'}
              </span>
              <h2 className="text-base font-bold text-slate-950 mt-1.5 leading-snug line-clamp-2">{productName}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
                <p>Qty: <span className="text-slate-900 font-bold">{order.quantity}</span></p>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <p>Total: <span className="text-blue-600 font-bold">₹{totalAmount.toLocaleString('en-IN')}</span></p>
              </div>
            </div>
          </div>

          {!isService && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                🚚 Expected Arrival: On or before {order.arrivalDate || order.arrival_date || calculateArrivalDate(order.createdAt || order.created_at, order.delivery_span)}
              </span>
            </div>
          )}
        </div>

        {/* Timeline Tracker Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Order Status Tracker</h3>

          <ul className="relative space-y-1">
            {steps.map((step, index) => {
              const { Icon, iconClassName, lineClassName } = getStatusAttributes(step.status)
              const isLastStep = index === steps.length - 1

              return (
                <li key={index} className="flex items-start gap-4">
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className={`z-10 mt-1 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm ${iconClassName}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLastStep && (
                      <div className={`absolute top-9 h-[calc(100%-1.25rem)] w-0.5 ${lineClassName}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-6 pt-1">
                    {step.date && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{step.date}</p>
                    )}
                    <h4 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">{step.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* QR Code Token Card (Only if order is handed over or ready for pickup) */}
        {(order.status === 'handed_over' || order.status === 'ready_for_pickup') && (order.secureTokenUser || order.qrCodeData || order.qr_code_data) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Verification QR Code</h3>
            <p className="text-xs text-slate-500">Present this QR code at the counter to verify and pay.</p>
            
            <div className="inline-block bg-white border border-slate-200 rounded-xl p-4 shadow-inner" ref={qrPreviewRef}>
              <QRCode
                value={order.secureTokenUser || order.qrCodeData || order.qr_code_data || ''}
                size={180}
              />
            </div>

            <div className="flex items-center gap-2 justify-center flex-wrap bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-sm mx-auto">
              <p className="text-xs font-mono text-slate-700 break-all select-all flex-1">
                Token: {order.secureTokenUser || order.qrCodeData}
              </p>
              <button
                type="button"
                onClick={() => copyToken(order.secureTokenUser || order.qrCodeData)}
                className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition bg-white"
                title="Copy Token"
              >
                <FaCopy className="w-3.5 h-3.5" />
              </button>
              {copied && <span className="text-[10px] font-bold text-green-600">✓ Copied</span>}
            </div>

            <button
              onClick={downloadActiveOrderQR}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white font-semibold py-2.5 hover:bg-slate-800 transition"
            >
              <FaDownload className="w-4 h-4" />
              Download QR
            </button>
          </div>
        )}

        {/* Pickup Location Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <FaStore className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-wider">Pickup Outlet</h3>
          </div>
          <div className="text-xs space-y-2 font-medium text-slate-600 leading-relaxed">
            <p>
              <span className="font-bold text-slate-800">Outlet Address:</span>{' '}
              {order.pickupLocation || order.pickup_location || 'BBHCBazaar Experience Outlet'}
            </p>
            <p>
              <span className="font-bold text-slate-800">Instructions:</span>{' '}
              {order.pickupInstructions || order.pickup_instructions || 'Show the QR code at the outlet counter.'}
            </p>
          </div>
        </div>

        {/* Cancel Order Area */}
        {order.status === 'pending_seller' && (
          <div className="pt-2">
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="w-full py-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {canceling ? 'Cancelling Order...' : 'Cancel Order'}
            </button>
          </div>
        )}

        {/* Leave a Review Area */}
        {order.status === 'completed' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <FaStar className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-black uppercase tracking-wider">{hasRated ? 'Your Review' : 'Leave a Review'}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <FaStar className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-slate-200'} transition-colors`} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What did you think about this item? (Optional)"
                className="w-full text-sm text-slate-900 bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px]"
              />
              {reviewMessage && (
                <p className={`text-xs font-semibold ${reviewMessage.includes('successfully') ? 'text-green-600' : 'text-red-500'}`}>
                  {reviewMessage}
                </p>
              )}
              {hasRated && editCount < 2 && (
                <p className="text-xs text-slate-500 font-medium">
                  You can edit your review {2 - editCount} more time{2 - editCount === 1 ? '' : 's'}.
                </p>
              )}
              {hasRated && editCount >= 2 && (
                <p className="text-xs text-orange-500 font-medium">
                  You have reached the maximum number of edits for this review.
                </p>
              )}
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || rating === 0 || (hasRated && editCount >= 2)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSubmittingReview ? 'Saving...' : (hasRated ? 'Update Review' : 'Submit Review')}
              </button>
            </div>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  )
}

export default UserOrderDetail
