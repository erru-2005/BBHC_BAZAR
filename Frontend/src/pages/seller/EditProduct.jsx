import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { FiRefreshCw, FiXCircle } from 'react-icons/fi'
import { getProductById, getCategoryCommissionRates } from '../../services/api'
import SellerProductForm from './components/ProductForm'

function SellerEditProduct() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryCommissionRates, setCategoryCommissionRates] = useState({})
  const { userType } = useSelector((state) => state.auth)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProductById(productId)
        setProduct(data)
        
        // Load category commission rates - Only for Masters to prevent 403 for sellers
        if (userType === 'master') {
          try {
            const rates = await getCategoryCommissionRates()
            setCategoryCommissionRates(rates || {})
          } catch (err) {
            setCategoryCommissionRates({})
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId, userType])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-4">
        <FiRefreshCw className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-xs font-black uppercase tracking-[0.3em] font-outfit">Loading Asset...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 text-center px-6">
        <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-rose-500">
           <FiXCircle className="w-12 h-12" />
        </div>
        <div className="max-w-md">
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter font-outfit">Access Denied</h2>
           <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">{error || 'The requested asset could not be located in your inventory.'}</p>
        </div>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95"
        >
          Return to Vault
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/seller/products')}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100"
            >
              <FiXCircle className="h-6 w-6" />
            </motion.button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase">Asset</span>
                 <span className="text-xl font-black text-blue-600 tracking-tight font-outfit uppercase">Refinement</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Inventory Update Protocol</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-32 space-y-10">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-outfit">Calibrate Asset</h1>
          <p className="text-sm font-bold text-blue-600 mt-2 uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
             ID: {productId.substring(0, 12)}...
          </p>
        </motion.div>
        
        <SellerProductForm initialProduct={product} />
      </div>
    </div>
  )
}

export default SellerEditProduct

