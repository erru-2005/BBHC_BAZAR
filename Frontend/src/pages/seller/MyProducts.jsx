import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiArrowLeft, FiRefreshCw, FiPackage, FiTag } from 'react-icons/fi'
import { getProducts } from '../../services/api'
import useProductSocket from '../../hooks/useProductSocket'

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function SellerMyProducts() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const productList = await getProducts()
        // getProducts returns array according to api service
        const normalized = Array.isArray(productList?.products)
          ? productList.products
          : Array.isArray(productList)
          ? productList
          : []
        setProducts(normalized)
      } catch (err) {
        setError(err.message || 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [refreshToken])

  useProductSocket((updatedProduct) => {
    if (!updatedProduct || !user) return
    const matchesSeller =
      updatedProduct.seller_trade_id === user.trade_id ||
      String(updatedProduct.created_by_user_id || '') === String(user.id || user._id)
    if (!matchesSeller) return

    setProducts((prev) => {
      const id = String(updatedProduct.id || updatedProduct._id)
      const existsIndex = prev.findIndex(
        (item) => String(item.id || item._id) === id
      )
      if (existsIndex >= 0) {
        const clone = [...prev]
        clone[existsIndex] = { ...clone[existsIndex], ...updatedProduct }
        return clone
      }
      return [updatedProduct, ...prev]
    })
  })

  const ownedProducts = useMemo(() => {
    if (!user) return []
    const sellerTradeId = user.trade_id
    const sellerId = String(user.id || user._id || '')

    return products.filter((product) => {
      const matchTradeId =
        sellerTradeId &&
        (product.seller_trade_id === sellerTradeId ||
          product.created_by === sellerTradeId ||
          product.created_by_user_id === sellerTradeId)
      const matchId =
        sellerId &&
        (String(product.created_by_user_id || '') === sellerId ||
          String(product.seller_id || '') === sellerId)

      return matchTradeId || matchId
    })
  }, [products, user])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF3FF] via-white to-[#F4ECFF] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-0">
        <button
          onClick={() => navigate('/seller')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
            <p className="text-sm text-gray-500">
              Review every product associated with{' '}
              <span className="font-semibold text-gray-700">{user?.trade_id}</span>.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRefreshToken((prev) => prev + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && ownedProducts.length === 0 && !error && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-10 text-center text-gray-500">
            <p className="text-base font-semibold text-gray-700">No products found</p>
            <p className="text-sm text-gray-500">Once products are created for this seller, they will appear here automatically.</p>
          </div>
        )}

        <div className="space-y-4">
          {ownedProducts.map((product) => {
            const quantity =
              product.quantity ||
              product.stock ||
              product.available_quantity ||
              product.inventory ||
              0
            return (
              <div
                key={product.id || product._id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(`/seller/products/${product.id || product._id}`, { state: { product } })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/seller/products/${product.id || product._id}`, { state: { product } })
                  }
                }}
                className="relative rounded-3xl border border-white/40 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/seller/products/${product.id || product._id}/edit`, { state: { product } })
                  }}
                  className="absolute right-4 top-4 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="hidden h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 sm:block">
                      {product.thumbnail ? (
                        <img
                          src={typeof product.thumbnail === 'string' ? product.thumbnail : product.thumbnail.preview}
                          alt={product.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Product</p>
                      <h2 className="text-xl font-semibold text-gray-900">{product.product_name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span className="font-semibold text-gray-800">{formatCurrency(product.selling_price)}</span>
                        {product.max_price && (
                          <span className="text-xs text-gray-400">
                            MRP <span className="line-through">{formatCurrency(product.max_price)}</span>
                          </span>
                        )}
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">Qty: {quantity}</span>
                      </div>
                      {product.categories?.length > 0 && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          <FiTag className="h-3 w-3" />
                          {Array.isArray(product.categories) ? product.categories[0] : product.categories}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-1">Last updated</p>
                    <p>{product.updated_at ? new Date(product.updated_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                {product.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SellerMyProducts

