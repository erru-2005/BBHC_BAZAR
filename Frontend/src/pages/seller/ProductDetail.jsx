import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiTag, FiPackage } from 'react-icons/fi'
import { getProductById } from '../../services/api'
import ProductMediaViewer from '../../components/ProductMediaViewer'
import useProductSocket from '../../hooks/useProductSocket'

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function SellerProductDetail() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState(location.state?.product || null)
  const [loading, setLoading] = useState(!location.state?.product)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  useEffect(() => {
    if (!product) {
      const fetchProduct = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await getProductById(productId)
          setProduct(data)
        } catch (err) {
          setError(err.message || 'Failed to load product')
        } finally {
          setLoading(false)
        }
      }
      fetchProduct()
    }
  }, [product, productId])

  useProductSocket((updatedProduct) => {
    if (
      updatedProduct &&
      product &&
      String(updatedProduct.id || updatedProduct._id) === String(product.id || product._id)
    ) {
      setProduct(updatedProduct)
    }
  })

  const discount = useMemo(() => {
    if (!product?.selling_price || !product?.max_price) return null
    const selling = Number(product.selling_price)
    const max = Number(product.max_price)
    if (max <= selling) return null
    return Math.round(((max - selling) / max) * 100)
  }, [product])

  const quantity =
    product?.quantity ||
    product?.stock ||
    product?.available_quantity ||
    product?.inventory ||
    0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Loading product…
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-semibold text-slate-700">{error || 'Product not found.'}</p>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF3FF] via-white to-[#F4ECFF] text-slate-900 pb-16">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/seller/products')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to products
          </button>
          <button
            onClick={() => navigate(`/seller/products/${product.id || product._id}/edit`, { state: { product } })}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Edit product
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 lg:p-8 space-y-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <ProductMediaViewer thumbnail={product.thumbnail} gallery={product.gallery} productName={product.product_name} />

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Product</p>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.product_name}</h1>
                {product.categories && (
                  <span className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    <FiTag className="w-3.5 h-3.5" />
                    {Array.isArray(product.categories) ? product.categories[0] : product.categories}
                  </span>
                )}
              </div>

              {(product.selling_price || product.max_price) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(product.selling_price || product.max_price)}</p>
                    {discount && (
                      <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">{discount}% OFF</span>
                    )}
                  </div>
                  {product.selling_price && product.max_price && discount && (
                    <p className="text-sm text-gray-500">
                      MRP: <span className="line-through">{formatCurrency(product.max_price)}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiPackage className="h-4 w-4" />
                    <span>Available quantity: <span className="font-semibold text-gray-900">{quantity}</span></span>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Seller Notes</p>
                <p className="text-sm text-gray-600">
                  Keep product information up to date. Any changes you make will immediately reflect on the master dashboard.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-2">Specification</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.specification}</p>
              </div>

              {product.points?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-2">Highlights</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {product.points.map((point, idx) => (
                      <li key={`${product.id}-point-${idx}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerProductDetail

