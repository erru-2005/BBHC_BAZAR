import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiTag, FiPackage, FiRefreshCw } from 'react-icons/fi'
import { motion } from 'framer-motion'
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-4">
        <FiRefreshCw className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] font-outfit">Accessing Asset...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 text-center px-6">
        <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-rose-500">
           <FiPackage className="w-12 h-12" />
        </div>
        <div className="max-w-md">
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter font-outfit">Asset Lost</h2>
           <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">{error || 'The requested asset data stream has been interrupted.'}</p>
        </div>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all"
        >
          Return to Vault
        </button>
      </div>
    )
  }

  return (
    <div key={productId} className="min-h-screen bg-slate-50/50 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto py-10 space-y-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/seller/products')}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:shadow-md transition-all"
          >
            <FiArrowLeft className="w-4 h-4" />
            BACK TO VAULT
          </button>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">ID:{productId.substring(0, 8)}</span>
            <button
              onClick={() => navigate(`/seller/products/${product.id || product._id}/edit`, { state: { product } })}
              className="px-10 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              CALIBRATE ASSET
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[4rem] p-6 border border-slate-100 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.1)] overflow-hidden"
          >
            <ProductMediaViewer 
              thumbnail={product.thumbnail} 
              gallery={product.gallery || []} 
              productName={product.product_name || 'Product'} 
            />
          </motion.div>

          <div className="space-y-10 py-4">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
                {Array.isArray(product.categories) ? product.categories[0] : (product.categories || 'Market Asset')}
              </span>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter font-outfit uppercase leading-[0.9]">{product.product_name}</h1>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.05)] space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <FiTag className="w-24 h-24 rotate-12" />
              </div>
              <div className="flex flex-col gap-2 relative z-10">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Valuation</span>
                 <div className="flex items-center gap-6">
                   <p className="text-5xl font-black text-slate-900 tracking-tight">{formatCurrency(product.selling_price)}</p>
                   {discount && (
                      <span className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-blue-500/30">
                         {discount}% ADVANTAGE
                      </span>
                   )}
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600">
                     <FiPackage strokeWidth={3} />
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory</p>
                     <p className="text-xl font-black text-slate-900 leading-none mt-1">{quantity} <span className="text-[10px] text-slate-300">UNITS</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-emerald-600">
                     <FiRefreshCw strokeWidth={3} />
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition</p>
                     <p className="text-xl font-black text-slate-900 leading-none mt-1 uppercase tracking-tighter">PRISTINE</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
                 <span className="w-1.5 h-4 bg-slate-200 rounded-full" />
                 Specifications
              </h3>
              <p className="text-lg font-bold text-slate-500 leading-relaxed uppercase tracking-tight opacity-70">
                {product.specification || 'NO DATA REGISTERED FOR THIS ASSET.'}
              </p>
            </div>

            {product.points?.length > 0 && (
              <div className="space-y-6 pt-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
                   <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                   Asset Parameters
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {product.points.filter(p => p).map((p, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {i + 1}
                      </div>
                      <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{p}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerProductDetail

