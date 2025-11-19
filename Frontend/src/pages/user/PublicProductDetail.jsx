import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import ProductMediaViewer from '../../components/ProductMediaViewer'
import { setHomeProducts } from '../../store/dataSlice'
import { getProducts } from '../../services/api'

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '—'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function PublicProductDetail() {
  const { productId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { home } = useSelector((state) => state.data)
  const productFromStore = home.products?.find((prod) => String(prod.id || prod._id) === productId)
  const [product, setProduct] = useState(location.state?.product || productFromStore)

  useEffect(() => {
    if (!product) {
      const loadProducts = async () => {
        try {
          const backendProducts = await getProducts()
          dispatch(setHomeProducts(backendProducts))
          const found = backendProducts.find((prod) => String(prod.id || prod._id) === productId)
          setProduct(found)
        } catch (err) {
          console.error('Failed to fetch product', err)
        }
      }
      loadProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, product])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-lg font-semibold text-slate-700 mb-4">Product not found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-full bg-[#131921] text-white font-semibold"
        >
          Back to home
        </button>
      </div>
    )
  }

  const sellingPrice = Number(product.selling_price || product.price || product.max_price || 0)
  const maxPrice = Number(product.max_price || product.selling_price || product.price || sellingPrice)
  const discount =
    sellingPrice && maxPrice && maxPrice > sellingPrice
      ? Math.round(((maxPrice - sellingPrice) / maxPrice) * 100)
      : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900 pb-16">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} quickLinks={home.mobileQuickLinks} categories={home.quickCategories} />

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 lg:p-10 space-y-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <ProductMediaViewer thumbnail={product.thumbnail} gallery={product.gallery} productName={product.product_name} />

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">Product</p>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.product_name}</h1>
                {product.categories && (
                  <span className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    {Array.isArray(product.categories) ? product.categories[0] : product.categories}
                  </span>
                )}
              </div>

              {(product.selling_price || product.max_price) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(product.selling_price || product.max_price)}</p>
                    {discount && <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">{discount}% OFF</span>}
                  </div>
                  {product.selling_price && product.max_price && discount && (
                    <p className="text-sm text-gray-500">
                      MRP: <span className="line-through">{formatCurrency(product.max_price)}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Specification</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.specification}</p>
              </div>

              {product.points?.length > 0 && (
                <div>
                  <p aclassName="text-xs uppercase tracking-widest text-gray-500 mb-2">Highlights</p>
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
      </main>

      <SiteFooter />
      <MobileBottomNav items={home.bottomNavItems} />
    </div>
  )
}

export default PublicProductDetail


