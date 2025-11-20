import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaTag } from 'react-icons/fa'
import { getProductById } from '../../services/api'
import ProductMediaViewer from '../../components/ProductMediaViewer'
import { motion } from 'framer-motion'
import { motionVariants, transitions } from '../../utils/animations'

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '—'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function MasterProductDetail() {
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

  const discount = useMemo(() => {
    if (!product?.selling_price || !product?.max_price) return null
    const selling = Number(product.selling_price)
    const max = Number(product.max_price)
    if (max <= selling) return null
    return Math.round(((max - selling) / max) * 100)
  }, [product])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Loading product details...
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-semibold text-slate-700">{error || 'Product not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  const sellerFullName = [product.seller_name || product.seller_trade_id].filter(Boolean).join(' ')
  const sellerTradeId = product.seller_trade_id || product.created_by_user_id || product.created_by || '—'
  const sellerEmail = product.seller_email || product.created_by_email || '—'
  const sellerPhone = product.seller_phone || product.seller_phone_number || '—'
  const quantityValue =
    product.quantity || product.stock || product.available_quantity || product.inventory || null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900 pb-16">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => navigate('/master')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <motion.div
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 lg:p-10 space-y-8"
          initial={motionVariants.fadeIn.initial}
          animate={motionVariants.fadeIn.animate}
          transition={transitions.smooth}
        >
          <div className="grid lg:grid-cols-2 gap-10">
            <ProductMediaViewer thumbnail={product.thumbnail} gallery={product.gallery} productName={product.product_name} />

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">Product</p>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.product_name}</h1>
                {product.categories && (
                  <span className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    <FaTag className="w-3.5 h-3.5" />
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
                  {quantityValue !== null && (
                    <p className="text-sm font-medium text-gray-700">
                      Available quantity: <span className="text-gray-900">{quantityValue}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Seller</p>
                {sellerFullName ? (
                  <>
                    <p className="text-lg font-semibold text-gray-900">{sellerFullName}</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      {sellerTradeId && <p>Trade ID: {sellerTradeId}</p>}
                      {sellerEmail && sellerEmail !== '—' && <p>Email: {sellerEmail}</p>}
                      {sellerPhone && sellerPhone !== '—' && <p>Phone: {sellerPhone}</p>}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No seller information available.</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Specification</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.specification}</p>
              </div>

              {product.points?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Highlights</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {product.points.map((point, idx) => (
                      <li key={`${product.id}-point-${idx}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default MasterProductDetail


