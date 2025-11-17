import { useEffect, useState } from 'react'
import { getProducts } from '../../../services/api'
import { FaSyncAlt } from 'react-icons/fa'

const getImageSrc = (image) => image?.preview || image?.data_url || image?.url || null

function ListProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Products</h2>
          <p className="text-sm text-gray-500">Browse every product added to BBHCBazaar.</p>
        </div>
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
          const categories = product.categories || []

          return (
            <div key={product.id || productName} className="border border-gray-200 rounded-xl p-5">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Product</p>
                    <h3 className="text-xl font-semibold text-gray-900">{productName}</h3>
                    <p className="text-xs text-gray-500">
                      Created by <span className="font-medium text-gray-800">{createdBy}</span> • {formattedCreatedAt}
                    </p>
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {categories.map((category) => (
                          <span
                            key={`${productName}-${category}`}
                            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {thumbnail && getImageSrc(thumbnail) && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Thumbnail</p>
                      <img
                        src={getImageSrc(thumbnail)}
                        alt={`${productName} thumbnail`}
                        className="w-full rounded-lg border object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Specification</p>
                    <p className="text-gray-700 whitespace-pre-line mt-1">{product.specification}</p>
                  </div>

                  {points.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Highlights / Points</p>
                      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        {points.map((point, idx) => (
                          <li key={`${productName}-point-${idx}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {gallery.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Gallery Images</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {gallery.map((image, idx) => {
                          const src = getImageSrc(image)
                          if (!src) return null
                          return (
                            <img
                              key={`${productName}-gallery-${idx}`}
                              src={src}
                              alt={`${productName} gallery`}
                              className="h-28 w-full object-cover rounded-lg border"
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ListProducts


