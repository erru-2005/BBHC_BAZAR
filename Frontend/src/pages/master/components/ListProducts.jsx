import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteProduct, getProducts } from '../../../services/api'
import { FaSyncAlt, FaTag } from 'react-icons/fa'
import { FiEdit, FiTrash2 } from 'react-icons/fi'

const getImageSrc = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  return image?.preview || image?.data_url || image?.url || null
}

function ListProducts({ onEditProduct, refreshSignal = 0 }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal])

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

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Products</h2>
          <p className="text-sm text-gray-500">Browse every product added to BBHCBazaar.</p>
        </div>
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="inline-flex items-center gap-2 w-full md:w-auto justify-center px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FaSyncAlt className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading && products.length === 0 ? (
        <p className="text-sm text-gray-500">Loading products from server...</p>
      ) : null}

      {!loading && products.length === 0 ? (
        <p className="text-sm text-gray-500">No products have been added yet.</p>
      ) : null}

      <div className="grid gap-5">
        {products.map((product) => {
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
            product.seller_name || product.created_by || 'Unknown seller'
          const sellerTradeId = product.seller_trade_id || product.created_by_user_id || '—'
          const productId = product.id || product._id || productName

          return (
            <article
              key={productId}
              className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 hover:shadow-lg transition cursor-pointer"
              onClick={() => navigate(`/master/products/${productId}`, { state: { product } })}
            >
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
                      <p className="text-xs text-gray-500">Added by {createdBy} • {formattedCreatedAt}</p>
                    </div>
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
                  </div>

                  <div className="text-sm text-gray-700 flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{sellerName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-xs uppercase">Trade ID: {sellerTradeId}</span>
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
        })}
      </div>
    </div>
  )
}

export default ListProducts


