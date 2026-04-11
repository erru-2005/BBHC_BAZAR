import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiTag, FiPackage, FiRefreshCw } from 'react-icons/fi'
import { getProductById } from '../../services/api'
import ProductMediaViewer from '../../components/ProductMediaViewer'
import useProductSocket from '../../hooks/useProductSocket'

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function SellerProductDetail() {
  console.log('[SellerProductDetail] MOUNTED for productId:', useParams().productId)
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [product, setProduct] = useState(location.state?.product || null)
  const [loading, setLoading] = useState(!location.state?.product)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('[SellerProductDetail] Effect running for productId:', productId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  useEffect(() => {
    if (!product) {
      const fetchProduct = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await getProductById(productId)
          if (!data) throw new Error('Product not found')
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

  const quantity = product?.quantity || product?.stock || 0

  if (loading) {
    return (
      <div className="min-h-screen spatial-bg flex items-center justify-center">
        <FiRefreshCw className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen spatial-bg flex flex-col items-center justify-center gap-4 text-center px-6">
        <FiPackage className="h-16 w-16 text-rose-500/20" />
        <p className="text-lg font-bold text-white">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div key={productId} className="min-h-screen spatial-bg text-slate-100 pb-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/seller/products')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => navigate(`/seller/products/${product.id || product._id}/edit`, { state: { product } })}
            className="px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider"
          >
            Edit
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="spatial-card p-4 bg-white/5 rounded-[40px] border border-white/5 overflow-hidden">
            <ProductMediaViewer 
              thumbnail={product.thumbnail} 
              gallery={product.gallery || []} 
              productName={product.product_name || 'Product'} 
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/10">
                {Array.isArray(product.categories) ? product.categories[0] : (product.categories || 'Product')}
              </span>
              <h1 className="text-3xl font-black text-white italic tracking-tighter">{product.product_name}</h1>
            </div>

            <div className="spatial-card p-6 bg-white/[0.03] rounded-[32px] border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <p className="text-3xl font-bold text-white">{formatCurrency(product.selling_price)}</p>
                {discount && <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-[10px] font-bold">{discount}% OFF</span>}
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <FiPackage className="text-rose-500" />
                  <span className="text-sm font-bold text-slate-300">Stock: <span className="text-white">{quantity}</span></span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Specification</h3>
              <p className="text-sm italic text-slate-400 leading-relaxed font-medium">
                {product.specification || 'No description provided.'}
              </p>
            </div>

            {product.points?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Highlights</h3>
                <ul className="space-y-2">
                  {product.points.filter(p => p).map((p, i) => (
                    <li key={i} className="flex gap-3 text-sm font-bold text-slate-300">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerProductDetail

