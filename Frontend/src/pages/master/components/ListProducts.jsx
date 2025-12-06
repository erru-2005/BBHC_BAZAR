import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { deleteProduct, getProducts, getPendingProducts, approveProduct, rejectProduct, getCategories } from '../../../services/api'
import { FaSyncAlt, FaTag, FaCheck, FaTimes, FaSearch } from 'react-icons/fa'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import useProductSocket from '../../../hooks/useProductSocket'

const SKELETON_PLACEHOLDERS = Array.from({ length: 4 })

const getImageSrc = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  return image?.preview || image?.data_url || image?.url || null
}

function ListProducts({ onEditProduct, refreshSignal = 0 }) {
  const [products, setProducts] = useState([])
  const [pendingProducts, setPendingProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const navigate = useNavigate()

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts()
      setProducts(data)
    } catch (err) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingProducts = async () => {
    setPendingLoading(true)
    try {
      const data = await getPendingProducts()
      setPendingProducts(data)
    } catch (err) {
      console.error('Failed to load pending products', err)
    } finally {
      setPendingLoading(false)
    }
  }

  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const data = await getCategories()
      // Handle both array of strings and array of objects
      const categoryList = Array.isArray(data) 
        ? data.map(cat => typeof cat === 'string' ? cat : (cat.name || cat.category || cat))
        : []
      setCategories(categoryList)
    } catch (err) {
      console.error('Failed to load categories', err)
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchPendingProducts()
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal])

  const handleApprove = async (productId) => {
    setProcessingId(productId)
    try {
      await approveProduct(productId)
      await fetchPendingProducts()
      await fetchProducts()
    } catch (err) {
      setError(err.message || 'Failed to approve product')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (productId) => {
    if (!window.confirm('Reject this product? It will be moved to bin.')) {
      return
    }
    setProcessingId(productId)
    try {
      await rejectProduct(productId, true)
      await fetchPendingProducts()
    } catch (err) {
      setError(err.message || 'Failed to reject product')
    } finally {
      setProcessingId(null)
    }
  }

  useProductSocket((updatedProduct) => {
    if (!updatedProduct) return
    setProducts((prev) => {
      const id = String(updatedProduct.id || updatedProduct._id)
      const index = prev.findIndex((product) => String(product.id || product._id) === id)
      if (index !== -1) {
        const clone = [...prev]
        clone[index] = { ...clone[index], ...updatedProduct }
        return clone
      }
      return [updatedProduct, ...prev]
    })
  })

  const handleDelete = async (event, product) => {
    event.stopPropagation()
    if (!window.confirm(`Delete "${product.product_name}" permanently?`)) {
      return
    }
    try {
      await deleteProduct(product.id || product._id)
      fetchProducts()
    } catch (err) {
      setError(err.message || 'Failed to delete product')
    }
  }

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => {
        const productCategories = product.categories || []
        const categoriesArray = Array.isArray(productCategories) 
          ? productCategories 
          : productCategories ? [productCategories] : []
        return categoriesArray.some(cat => {
          const catName = typeof cat === 'string' ? cat : (cat.name || cat.category || cat)
          return catName.toLowerCase() === selectedCategory.toLowerCase()
        })
      })
    }

    // Filter by search query (searches all fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(product => {
        const productName = (product.product_name || product.productName || '').toLowerCase()
        const sellerName = (product.seller_name || product.created_by || '').toLowerCase()
        const sellerTradeId = (product.seller_trade_id || product.created_by_user_id || '').toLowerCase()
        const specification = (product.specification || '').toLowerCase()
        const productId = String(product.id || product._id || '').toLowerCase()
        
        // Search in categories
        const productCategories = product.categories || []
        const categoriesArray = Array.isArray(productCategories) 
          ? productCategories 
          : productCategories ? [productCategories] : []
        const categoryMatch = categoriesArray.some(cat => {
          const catName = typeof cat === 'string' ? cat : (cat.name || cat.category || cat)
          return catName.toLowerCase().includes(query)
        })

        return (
          productName.includes(query) ||
          sellerName.includes(query) ||
          sellerTradeId.includes(query) ||
          specification.includes(query) ||
          productId.includes(query) ||
          categoryMatch
        )
      })
    }

    return filtered
  }, [products, searchQuery, selectedCategory])

  // Filter pending products by search query (category filter doesn't apply to pending)
  const filteredPendingProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return pendingProducts
    }

    const query = searchQuery.toLowerCase().trim()
    return pendingProducts.filter(product => {
      const productName = (product.product_name || product.productName || '').toLowerCase()
      const sellerName = (product.seller_name || product.created_by || '').toLowerCase()
      const sellerTradeId = (product.seller_trade_id || product.created_by_user_id || '').toLowerCase()
      const specification = (product.specification || '').toLowerCase()
      const productId = String(product.id || product._id || '').toLowerCase()
      
      // Search in categories
      const productCategories = product.categories || []
      const categoriesArray = Array.isArray(productCategories) 
        ? productCategories 
        : productCategories ? [productCategories] : []
      const categoryMatch = categoriesArray.some(cat => {
        const catName = typeof cat === 'string' ? cat : (cat.name || cat.category || cat)
        return catName.toLowerCase().includes(query)
      })

      return (
        productName.includes(query) ||
        sellerName.includes(query) ||
        sellerTradeId.includes(query) ||
        specification.includes(query) ||
        productId.includes(query) ||
        categoryMatch
      )
    })
  }, [pendingProducts, searchQuery])

  const renderProductCard = (product, isPending = false) => {
    const productName = product.product_name || product.productName || 'Untitled product'
    const createdBy = product.created_by || 'Unknown'
    const createdAt = product.created_at || product.createdAt
    const formattedCreatedAt = createdAt ? new Date(createdAt).toLocaleString() : 'N/A'
    const thumbnail = product.thumbnail || product.media?.thumbnail
    const gallery = product.gallery || product.media?.gallery || []
    const points = product.points || []
    const rawCategories = product.categories ?? []
    const categories = Array.isArray(rawCategories)
      ? rawCategories
      : rawCategories
      ? [rawCategories]
      : []
    const selling = Number(product.selling_price || product.price || 0)
    const max = Number(product.max_price || product.mrp || selling)
    const discount = max > selling ? Math.round(((max - selling) / max) * 100) : null
    const sellerName =
      product.seller_name ||
      product.created_by ||
      product.created_by_user_id ||
      product.seller_trade_id ||
      'Unknown seller'
    const sellerTradeId = product.seller_trade_id || product.created_by_user_id || product.created_by || '—'
    const quantityValue =
      product.quantity ||
      product.stock ||
      product.available_quantity ||
      product.inventory ||
      0
    const productId = product.id || product._id || productName
    const isProcessing = processingId === productId

    return (
      <article
        key={productId}
        className={`border ${isPending ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'} rounded-2xl p-4 flex flex-col gap-4 ${!isPending ? 'hover:shadow-lg transition cursor-pointer' : ''}`}
        onClick={!isPending ? () => navigate(`/master/products/${productId}`, { state: { product } }) : undefined}
      >
        {isPending && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-yellow-200">
            <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
              {product.original_product_id ? 'Edit Request' : 'New Product - Pending Approval'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleApprove(productId)
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaCheck className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Accept'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReject(productId)
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaTimes className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-32 h-40 sm:h-28 bg-gray-50 border rounded-xl flex items-center justify-center overflow-hidden">
            {getImageSrc(thumbnail) ? (
              <img
                src={getImageSrc(thumbnail)}
                alt={`${productName} thumbnail`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400 text-center px-2">No image</span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Product</p>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{productName}</h3>
                <p className="text-xs text-gray-500">
                  Added by {createdBy} • {formattedCreatedAt}
                </p>
              </div>
              {!isPending && (
                <div className="flex items-center gap-2 self-start">
                  <button
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditProduct?.(product)
                    }}
                    aria-label={`Edit ${productName}`}
                  >
                    <FiEdit className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    className="p-2 rounded-lg bg-gray-100 hover:bg-red-50"
                    onClick={(event) => handleDelete(event, product)}
                    aria-label={`Delete ${productName}`}
                  >
                    <FiTrash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-700 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{sellerName}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-xs uppercase">Trade ID: {sellerTradeId}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 text-xs uppercase">Qty: {quantityValue}</span>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 3).map((category) => (
                  <span
                    key={`${productName}-${category}`}
                    className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center gap-1"
                  >
                    <FaTag className="w-3 h-3" />
                    {category}
                  </span>
                ))}
                {categories.length > 3 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-500">
                    +{categories.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-2 text-gray-900">
          <span className="text-2xl font-bold">₹{selling.toLocaleString('en-IN')}</span>
          {max > selling && (
            <>
              <span className="text-sm text-gray-500 line-through">₹{max.toLocaleString('en-IN')}</span>
              {discount && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {discount}% OFF
                </span>
              )}
            </>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Products</h2>
          <p className="text-sm text-gray-500">Browse every product added to BBHCBazaar.</p>
        </div>
        <button
          onClick={() => {
            fetchProducts()
            fetchPendingProducts()
          }}
          disabled={loading || pendingLoading}
          className="inline-flex items-center gap-2 w-full md:w-auto justify-center px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FaSyncAlt className={`w-4 h-4 ${loading || pendingLoading ? 'animate-spin' : ''}`} />
          {loading || pendingLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products by name, seller, category, ID, or specification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>

        {/* Category Filter Dropdown */}
        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white"
            disabled={categoriesLoading}
          >
            <option value="">All Categories</option>
            {categories.map((category, index) => {
              const categoryName = typeof category === 'string' ? category : (category.name || category.category || category)
              return (
                <option key={index} value={categoryName}>
                  {categoryName}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Search Results Info */}
      {(searchQuery || selectedCategory) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Showing {filteredProducts.length} of {products.length} products
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedCategory && ` in category "${selectedCategory}"`}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Pending Products Section */}
      {filteredPendingProducts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Pending Approval ({filteredPendingProducts.length}{searchQuery && ` of ${pendingProducts.length}`})
          </h3>
          <div className="grid gap-5">
            {filteredPendingProducts.map((product) => renderProductCard(product, true))}
          </div>
        </div>
      )}

      {/* Approved Products Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Approved Products
          {(searchQuery || selectedCategory) && ` (${filteredProducts.length}${searchQuery || selectedCategory ? ` of ${products.length}` : ''})`}
        </h3>

      {loading && products.length === 0 ? (
        <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
          <p className="text-sm text-gray-500">Loading products from server...</p>
          <div className="grid gap-5">
            {SKELETON_PLACEHOLDERS.map((_, index) => (
              <article
                key={`product-skeleton-${index}`}
                className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4"
                aria-hidden="true"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-32">
                    <Skeleton height={160} borderRadius="0.75rem" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <Skeleton width={70} height={10} />
                        <Skeleton width="60%" height={20} />
                        <Skeleton width="40%" height={12} />
                      </div>
                      <div className="flex items-center gap-2 self-start">
                        <Skeleton width={40} height={40} borderRadius="0.75rem" />
                        <Skeleton width={40} height={40} borderRadius="0.75rem" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton width={32} height={32} circle />
                      <Skeleton width="35%" height={14} />
                      <Skeleton width="20%" height={14} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 3 }).map((__, chipIndex) => (
                        <Skeleton key={`chip-${chipIndex}`} width={70} height={20} borderRadius="9999px" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <Skeleton width={140} height={28} />
                  <Skeleton width={90} height={18} />
                  <Skeleton width={60} height={18} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && products.length === 0 ? (
        <p className="text-sm text-gray-500">No products have been added yet.</p>
      ) : null}

      {!loading && products.length > 0 && filteredProducts.length === 0 ? (
        <p className="text-sm text-gray-500">
          No products found
          {searchQuery && ` matching "${searchQuery}"`}
          {selectedCategory && ` in category "${selectedCategory}"`}
        </p>
      ) : null}

        {filteredProducts.length > 0 && (
          <div className="grid gap-5">
            {filteredProducts.map((product) => renderProductCard(product, false))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ListProducts


