import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { toggleWishlist } from '../../store/dataSlice'
import ProductCard from './components/ProductCard'

function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const homeData = useSelector((state) => state.data.home)
  const { recommendationRows, wishlist, mobileQuickLinks, quickCategories, bottomNavItems } = homeData

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [productId])

  const product = useMemo(() => {
    const map = {}
    recommendationRows.forEach((row) => {
      row.products.forEach((prod) => {
        map[prod.id] = prod
      })
    })
    return map[productId]
  }, [recommendationRows, productId])

  const imageList = product?.images?.length ? product.images : product?.image ? [product.image] : []
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const activeImage = imageList[activeImageIndex] || ''
  const isWishlisted = wishlist?.includes(product?.id)

  const relatedProducts = useMemo(() => {
    const items = []
    recommendationRows.forEach((row) => {
      row.products.forEach((entry) => {
        if (entry.id !== productId) {
          items.push(entry)
        }
      })
    })
    return items.slice(0, 6)
  }, [recommendationRows, productId])

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-lg font-semibold text-slate-700 mb-4">Product not found or has moved.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-full bg-[#131921] text-white font-semibold"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        quickLinks={mobileQuickLinks}
        categories={quickCategories}
      />

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-8 pb-28 lg:pb-16">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-amber-600 mb-4"
        >
          ← Back to results
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="rounded-[28px] bg-white shadow overflow-hidden transform-gpu transition duration-500 hover:shadow-2xl">
              {activeImage && (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-[360px] md:h-[480px] object-cover"
                />
              )}
            </div>
            {imageList.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto">
                {imageList.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden ${
                      idx === activeImageIndex ? 'border-amber-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow p-6 space-y-4 transform-gpu transition duration-500 hover:-translate-y-1">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-wide text-slate-500">{product.brand}</p>
              <h1 className="text-2xl font-black text-slate-900">{product.name}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{product.rating}★</span>
                <span>{product.reviews} ratings</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-slate-900">{product.price}</span>
                <span className="line-through text-slate-400">{product.mrp}</span>
                <span className="text-sm font-semibold text-emerald-600">{product.discount}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">inclusive of all taxes</p>
            </div>

            {product.sizes?.length ? (
              <div>
                <p className="text-sm font-semibold mb-2">Select size</p>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="text-sm px-4 py-2 border rounded-full bg-slate-50 text-slate-700"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row">
              <button className="flex-1 px-4 py-3 bg-[#131921] text-white font-semibold rounded-full shadow hover:bg-slate-900 transition">
                Add to bag
              </button>
              <button
                className={`flex-1 px-4 py-3 rounded-full border font-semibold transition ${
                  isWishlisted ? 'border-pink-500 text-pink-500' : 'border-slate-200 text-slate-700'
                }`}
                onClick={() => dispatch(toggleWishlist(product.id))}
              >
                {isWishlisted ? 'Wishlisted' : 'Wishlist'}
              </button>
            </div>

            {product.highlights?.length ? (
              <div>
                <p className="text-sm font-semibold mb-2">Highlights</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  {product.highlights.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {product.description ? (
              <div>
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-28 lg:pb-16">
        <h3 className="text-xl font-bold text-slate-900 mb-3">You might also like</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {relatedProducts.map((item) => (
            <ProductCard
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              image={item.image}
              wished={wishlist.includes(item.id)}
              onToggleWishlist={() => dispatch(toggleWishlist(item.id))}
            />
          ))}
        </div>
      </section>

      <SiteFooter />
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}

export default ProductDetail


