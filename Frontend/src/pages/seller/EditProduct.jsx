import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProductById } from '../../services/api'
import SellerProductForm from './components/ProductForm'

function SellerEditProduct() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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
  }, [productId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">
        Loading product…
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-semibold text-slate-300">{error || 'Product not found.'}</p>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/5"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pt-24 pb-10">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0 bg-[#0f172a] pointer-events-none" />

      {/* Top header consistent with seller dashboard */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl shadow-lg shadow-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-4 sm:px-4 sm:py-4 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3.5 py-1.5 shadow-inner ring-1 ring-white/10 backdrop-blur-sm sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-white sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-bold text-rose-300 sm:text-base">
                  Bazaar
                </span>
              </div>
            </div>
            <span className="hidden text-sm font-medium text-slate-400 sm:inline">
              Seller · Edit Product
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-4 space-y-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Edit Product</h1>
          <p className="text-sm text-slate-400">Make updates to keep your listing accurate and fresh.</p>
        </div>
        <SellerProductForm initialProduct={product} />
      </div>
    </div>
  )
}

export default SellerEditProduct

