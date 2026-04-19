import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiRefreshCw, FiPackage, FiSearch, FiPlus, FiArrowUpRight, FiMoreVertical } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { getSellerMyProducts } from '../../services/api'
import useProductSocket from '../../hooks/useProductSocket'
import { fixImageUrl } from '../../utils/image'

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
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const productList = await getSellerMyProducts()
        setProducts(productList)
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
    if (!searchQuery) return products
    const lowerQuery = searchQuery.toLowerCase()
    return products.filter(p => p.product_name?.toLowerCase().includes(lowerQuery))
  }, [products, searchQuery])

  return (
    <div className="p-4 md:p-10 flex flex-col gap-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Asset Inventory</h1>
          <p className="text-slate-500 font-bold text-lg mt-1 italic opacity-80">Catalog and manage your marketplace listings.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="relative group flex-1 md:flex-none">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-5 h-5" />
              <input 
                type="text" 
                placeholder="Locate an asset..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none w-full md:w-64 transition-all shadow-sm"
              />
           </div>
           <button 
             onClick={() => navigate('/seller/products/new')}
             className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 px-8 group active:scale-95"
           >
              <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              <span className="font-black text-xs tracking-[0.2em] hidden sm:inline">ADD ASSET</span>
           </button>
        </div>
      </div>

      {loading && ownedProducts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[2.5rem] border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {ownedProducts.length === 0 ? (
              <div className="col-span-full py-32 text-center seller-card-premium border-dashed border-slate-300 bg-slate-50/50">
                <FiPackage className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-slate-400 tracking-tight">Vault is Empty</h3>
                <p className="text-slate-400 font-bold mt-2">Initialize your first marketplace entry above.</p>
              </div>
            ) : (
              ownedProducts.map((product) => (
                <motion.div
                  key={product.id || product._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="seller-card-premium group relative flex flex-col cursor-pointer overflow-hidden p-3"
                  onClick={() => navigate(`/seller/products/${product.id || product._id}`, { state: { product } })}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-slate-100 border border-slate-200/50">
                    {product.thumbnail || product.image ? (
                      <img 
                        src={fixImageUrl(product.thumbnail || product.image)} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <FiPackage className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                       <span className="bg-slate-900/40 backdrop-blur-md px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white border border-white/20">
                          {product.categories?.[0] || 'CLASSIFIED'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors truncate flex-1 uppercase tracking-tight">{product.product_name}</h3>
                       <button className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors"><FiMoreVertical /></button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valuation</span>
                          <span className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(product.selling_price)}</span>
                       </div>
                       <div className="text-right flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Availability</span>
                          <div className="flex items-center gap-1.5 justify-end mt-1">
                             <div className={`w-2.5 h-2.5 rounded-full shadow-sm animate-pulse ${product.quantity > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span className={`text-[10px] font-black uppercase tracking-widest ${(product.quantity || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {product.quantity > 0 ? 'In Stock' : 'Depleted'}
                             </span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">QNTY:</span>
                          <span className="text-xs font-black text-slate-800">{product.quantity || 0}</span>
                       </div>
                       <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:text-blue-700 transition-colors">
                          FULL SPECS <FiArrowUpRight className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default SellerMyProducts
