export const STATUS_STYLES = {
  pending_seller: { label: 'New Order', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  seller_accepted: { label: 'Accepted', className: 'bg-sky-100 text-sky-800 border border-sky-200' },
  seller_rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 border border-rose-200' },
  handed_over: { label: 'Handed Over', className: 'bg-violet-100 text-violet-800 border border-violet-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
  cancelled_master: { label: 'Master Cancelled', className: 'bg-gray-100 text-gray-700 border border-gray-200' }
}

export const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'cancelled_master', 'seller_rejected'])

export const isOrderService = (order) => {
  if (!order) return false
  const productData = order.product || order.product_snapshot || {}
  const productName = (productData.name || productData.product_name || '').toLowerCase()
  const productCategories = (productData.categories || []).map((c) => c.toLowerCase())

  return (
    order.type === 'service' ||
    (order.booking &&
      (order.booking.type || order.booking.startDate || order.booking.endDate || order.booking.flexible)) ||
    productName.includes('creativework') ||
    productName.includes('creative') ||
    productName.includes('work') ||
    productName.includes('service') ||
    productCategories.some((cat) => cat.includes('service') || cat.includes('creative') || cat.includes('work'))
  )
}

export const isHistoryOrder = (order) => HISTORY_STATUSES.has(order?.status)

export const isActiveOrder = (order) => !isHistoryOrder(order)

export const formatOrderDate = (dateString, options = {}) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  })
}

export const formatOrderDateShort = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const getOrderProductName = (order) =>
  order?.product?.name || order?.product?.product_name || 'Item'

export const getOrderProductImage = (order) =>
  order?.product?.thumbnail || order?.product?.image || null

export const getOrderTotal = (order) =>
  Number(order?.totalAmount || order?.total_amount || 0).toLocaleString('en-IN')

export const getBookingSummary = (booking) => {
  if (!booking) return null
  if (booking.type === 'flexible' || booking.flexible) return 'Flexible booking'
  if (booking.type === 'range' && booking.startDate && booking.endDate) {
    return `${formatOrderDateShort(booking.startDate)} → ${formatOrderDateShort(booking.endDate)}`
  }
  if (booking.startDate) return formatOrderDateShort(booking.startDate)
  return booking.type ? `${booking.type} booking` : null
}
