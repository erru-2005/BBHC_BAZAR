/**
 * Orders List Component for Master Dashboard
 * Features: Real-time updates, search, filters, export, accept/reject
 */
import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../../../utils/socket'
import { FaSearch, FaFileExcel, FaCheckCircle, FaTimesCircle, FaFilter } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders, updateOrderStatus } from '../../../services/api'
import XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function OrdersList() {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const socket = getSocket()

  // Initialize orders
  useEffect(() => {
    let isMounted = true

    const fetchOrders = async () => {
      try {
        setLoadingOrders(true)
        const apiOrders = await getOrders()
        if (isMounted) {
          setOrders(apiOrders)
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message)
        }
      } finally {
        if (isMounted) {
          setLoadingOrders(false)
        }
      }
    }

    fetchOrders()

    return () => {
      isMounted = false
    }
  }, [])

  // Real-time order updates via Socket.IO
  useEffect(() => {
    if (!socket) return

    const handleNewOrder = (orderData) => {
      // Add new order to the top of the list
      setOrders(prev => [orderData, ...prev])
      
      // Show animated notification
      showNotification({
        id: Date.now(),
        type: 'new_order',
        message: `New order received: ${orderData.orderNumber}`,
        order: orderData
      })
    }

    const handleOrderUpdate = (orderData) => {
      setOrders(prev => 
        prev.map(order => 
          order.id === orderData.id ? orderData : order
        )
      )
    }

    socket.on('new_order', handleNewOrder)
    socket.on('order_updated', handleOrderUpdate)

    return () => {
      socket.off('new_order', handleNewOrder)
      socket.off('order_updated', handleOrderUpdate)
    }
  }, [socket])

  // Filter and search orders
  useEffect(() => {
    let filtered = orders

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.product.name.toLowerCase().includes(query) ||
        order.seller.name.toLowerCase().includes(query) ||
        order.user.name.toLowerCase().includes(query)
      )
    }

    // Sort by latest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    setFilteredOrders(filtered)
  }, [orders, searchQuery, statusFilter])

  // Show notification
  const showNotification = (notification) => {
    setNotifications(prev => [...prev, notification])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  // Handle order click
  const handleOrderClick = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  // Handle accept order
  const handleAcceptOrder = async (orderId) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, 'accepted')
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? updatedOrder : order
        )
      )
      setShowDetailModal(false)
      showNotification({
        id: Date.now(),
        type: 'success',
        message: 'Order accepted successfully'
      })
    } catch (error) {
      console.error('Error accepting order:', error)
      showNotification({
        id: Date.now(),
        type: 'error',
        message: 'Failed to accept order'
      })
    }
  }

  const wrapText = (text, maxLength = 32) => {
    if (!text) return ''
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    words.forEach((word) => {
      const candidate = `${currentLine ? `${currentLine} ` : ''}${word}`
      if (candidate.length > maxLength) {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      } else {
        currentLine = candidate
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.join('\n')
  }

  // Format order data for exports
  const formatOrderForExport = (order) => {
    const productName = order.product?.name || order.product?.product_name || 'Product'
    const sellerName =
      order.seller?.name ||
      [order.seller?.first_name, order.seller?.last_name].filter(Boolean).join(' ').trim() ||
      '—'
    const sellerTrade =
      order.seller?.tradeId ||
      order.seller?.trade_id ||
      order.product?.sellerTradeId ||
      '—'
    const userName =
      order.user?.name ||
      [order.user?.first_name, order.user?.last_name].filter(Boolean).join(' ').trim() ||
      'Customer'
    const userEmail = order.user?.email || '—'
    const totalAmount = Number(order.totalAmount || order.total_amount || 0)
    const createdAt = order.createdAt || order.created_at || order.orderTime

    return {
      orderNumber: order.orderNumber,
      productName,
      sellerName,
      sellerTrade,
      userName,
      userEmail,
      quantity: order.quantity,
      status: order.status,
      totalAmount: totalAmount ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹0',
      createdAt: formatDate(createdAt)
    }
  }

  const prepareExportRows = ({ wrapProductAndSeller = false } = {}) => {
    return filteredOrders.map((order) => {
      const formatted = formatOrderForExport(order)

      if (wrapProductAndSeller) {
        return {
          ...formatted,
          productName: wrapText(formatted.productName),
          sellerName: wrapText(formatted.sellerName, 28)
        }
      }

      return formatted
    })
  }

  // Handle reject order
  const handleRejectOrder = async (orderId) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, 'rejected')
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? updatedOrder : order
        )
      )
      setShowDetailModal(false)
      showNotification({
        id: Date.now(),
        type: 'success',
        message: 'Order rejected successfully'
      })
    } catch (error) {
      console.error('Error rejecting order:', error)
      showNotification({
        id: Date.now(),
        type: 'error',
        message: 'Failed to reject order'
      })
    }
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredOrders.length) {
      showNotification({
        id: Date.now(),
        type: 'info',
        message: 'No orders available to export'
      })
      return
    }

    try {
      const headerConfig = [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'productName', label: 'Product Name' },
        { key: 'sellerName', label: 'Seller Name' },
        { key: 'sellerTrade', label: 'Seller Trade' },
        { key: 'userName', label: 'User Name' },
        { key: 'userEmail', label: 'User Email' },
        { key: 'quantity', label: 'Qty' },
        { key: 'status', label: 'Status' },
        { key: 'totalAmount', label: 'Amount' },
        { key: 'createdAt', label: 'Created At' }
      ]

      const rows = prepareExportRows({ wrapProductAndSeller: true })
      const tableMatrix = [
        headerConfig.map((col) => col.label),
        ...rows.map((row) => headerConfig.map((col) => row[col.key] ?? ''))
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(tableMatrix)

      // Dynamically size columns so no data is hidden
      const columnWidths = headerConfig.map((_, columnIndex) => {
        const maxLength = tableMatrix.reduce((max, currentRow) => {
          const cellValue = currentRow[columnIndex]?.toString() ?? ''
          const lines = cellValue.split('\n')
          const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0)
          return Math.max(max, longestLine)
        }, 0)

        const minWidth = columnIndex === 1 || columnIndex === 2 ? 30 : 12
        const maxWidth = columnIndex === 1 || columnIndex === 2 ? 60 : 40
        return {
          wch: Math.min(Math.max(maxLength + 2, minWidth), maxWidth)
        }
      })

      worksheet['!cols'] = columnWidths
      worksheet['!rows'] = worksheet['!rows'] || []
      worksheet['!rows'][0] = { hpt: 22 }
      worksheet['!pageSetup'] = {
        fitToWidth: 1,
        fitToHeight: 0,
        orientation: 'landscape',
        paperSize: 9 // A4
      }

      const range = XLSX.utils.decode_range(worksheet['!ref'])
      for (let C = range.s.c; C <= range.e.c; C += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if (!worksheet[cellAddress]) continue
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFFFF' } },
          fill: { fgColor: { rgb: '111827' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }

      const wrapColumns = [1, 2]
      for (let R = 1; R <= range.e.r; R += 1) {
        wrapColumns.forEach((columnIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: columnIndex })
          const cell = worksheet[cellAddress]
          if (!cell) return
          cell.s = {
            ...(cell.s || {}),
            alignment: {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true
            }
          }
        })
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const timestamp = new Date().toISOString().split('T')[0]
      saveAs(blob, `bbhc-orders-${timestamp}.xlsx`)
      showNotification({
        id: Date.now(),
        type: 'success',
        message: 'Excel exported successfully'
      })
    } catch (error) {
      console.error('Error exporting Excel:', error)
      showNotification({
        id: Date.now(),
        type: 'error',
        message: 'Failed to export Excel'
      })
    }
  }


  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="w-full">
      {/* Header with Search, Filters, and Export */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 w-full lg:max-w-md">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders, products, sellers, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Filters and Export Buttons */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <FaFileExcel className="w-5 h-5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Seller</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingOrders ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const productName = order.product?.name || order.product?.product_name || 'Product'
                  const productImage = order.product?.thumbnail || order.product?.image || 'https://via.placeholder.com/80?text=BBHC'
                  const sellerName =
                    order.seller?.name ||
                    [order.seller?.first_name, order.seller?.last_name].filter(Boolean).join(' ').trim() ||
                    '—'
                  const sellerTrade =
                    order.seller?.tradeId ||
                    order.seller?.trade_id ||
                    order.product?.sellerTradeId ||
                    '—'
                  const userName =
                    order.user?.name ||
                    [order.user?.first_name, order.user?.last_name].filter(Boolean).join(' ').trim() ||
                    'Customer'
                  const userEmail = order.user?.email || '—'
                  const totalAmount = Number(order.totalAmount || order.total_amount || 0)
                  const createdAt = order.createdAt || order.created_at || order.orderTime

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleOrderClick(order)}
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="font-medium text-gray-900 break-words leading-snug max-w-[180px]">
                          {order.orderNumber}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={productImage}
                            alt={productName}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 leading-snug break-words max-w-[220px]">
                              {productName}
                            </div>
                            <div className="text-xs text-gray-500">Qty: {order.quantity}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="text-gray-900 break-words leading-snug max-w-[200px]">
                          {sellerName}
                        </div>
                        <div className="text-xs text-gray-500 break-all">{sellerTrade}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="text-gray-900 break-words leading-snug max-w-[220px]">
                          {userName}
                        </div>
                        <div className="text-xs text-gray-500 break-all">{userEmail}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(createdAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setShowDetailModal(false)}
            onAccept={handleAcceptOrder}
            onReject={handleRejectOrder}
          />
        )}
      </AnimatePresence>

      {/* Animated Notifications */}
      <NotificationContainer notifications={notifications} />
    </div>
  )
}

// Order Detail Modal Component
function OrderDetailModal({ order, onClose, onAccept, onReject }) {
  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const productName = order.product?.name || order.product?.product_name || 'Product'
  const productImage = order.product?.thumbnail || order.product?.image || 'https://via.placeholder.com/120?text=BBHC'
  const productPrice = Number(order.product?.price || order.product?.selling_price || 0)
  const sellerName =
    order.seller?.name ||
    [order.seller?.first_name, order.seller?.last_name].filter(Boolean).join(' ').trim() ||
    '—'
  const sellerTradeId =
    order.seller?.tradeId ||
    order.seller?.trade_id ||
    order.product?.sellerTradeId ||
    '—'
  const sellerEmail = order.seller?.email || '—'
  const sellerPhone = order.seller?.phone || order.seller?.phone_number || '—'
  const userName =
    order.user?.name ||
    [order.user?.first_name, order.user?.last_name].filter(Boolean).join(' ').trim() ||
    'Customer'
  const userEmail = order.user?.email || '—'
  const userPhone = order.user?.phone || order.user?.phone_number || '—'
  const userAddress = order.user?.address || '—'
  const totalAmount = Number(order.totalAmount || order.total_amount || 0)
  const createdAt = order.createdAt || order.created_at || order.orderTime

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Order Number</div>
              <div className="text-lg font-semibold text-gray-900">{order.orderNumber}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Order Time</div>
              <div className="text-lg font-semibold text-gray-900">{formatDate(createdAt)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Total Amount</div>
              <div className="text-lg font-semibold text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className="text-lg font-semibold text-gray-900 capitalize">{order.status}</div>
            </div>
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
            <div className="flex gap-4 bg-gray-50 rounded-lg p-4">
              <img
                src={productImage}
                alt={productName}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="text-xl font-semibold text-gray-900 mb-2">{productName}</div>
                <div className="text-sm text-gray-600 mb-1">Product ID: {order.product?.id}</div>
                <div className="text-lg font-semibold text-amber-600">₹{productPrice.toLocaleString('en-IN')}</div>
                <div className="text-sm text-gray-600 mt-2">Quantity: {order.quantity}</div>
              </div>
            </div>
          </div>

          {/* Seller Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><span className="text-sm text-gray-500">Name:</span> <span className="font-medium text-gray-900">{sellerName}</span></div>
              <div><span className="text-sm text-gray-500">Trade ID:</span> <span className="font-medium text-gray-900">{sellerTradeId}</span></div>
              <div><span className="text-sm text-gray-500">Email:</span> <span className="font-medium text-gray-900">{sellerEmail}</span></div>
              <div><span className="text-sm text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{sellerPhone}</span></div>
            </div>
          </div>

          {/* User Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><span className="text-sm text-gray-500">Name:</span> <span className="font-medium text-gray-900">{userName}</span></div>
              <div><span className="text-sm text-gray-500">Email:</span> <span className="font-medium text-gray-900">{userEmail}</span></div>
              <div><span className="text-sm text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{userPhone}</span></div>
              <div><span className="text-sm text-gray-500">Address:</span> <span className="font-medium text-gray-900">{userAddress}</span></div>
            </div>
          </div>

          {/* Action Buttons */}
          {order.status === 'pending' && (
            <div className="border-t border-gray-200 pt-6 flex gap-4">
              <button
                onClick={() => onAccept(order.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                <FaCheckCircle className="w-5 h-5" />
                Accept Order
              </button>
              <button
                onClick={() => onReject(order.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                <FaTimesCircle className="w-5 h-5" />
                Reject Order
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Notification Container Component
function NotificationContainer({ notifications }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className={`min-w-[300px] max-w-md rounded-lg shadow-lg p-4 ${
              notification.type === 'new_order' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' :
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="font-semibold">{notification.message}</div>
                {notification.order && (
                  <div className="text-sm mt-1 opacity-90">
                    Order: {notification.order.orderNumber}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default OrdersList

