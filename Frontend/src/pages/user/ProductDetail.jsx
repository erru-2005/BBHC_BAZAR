import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { setHomeProducts, updateProductInCache, toggleWishlist } from '../../store/dataSlice'
import { initSocket, getSocket } from '../../utils/socket'
import ProductCard from './components/ProductCard'

function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { home } = useSelector((state) => state.data)
  const { recommendationRows, wishlist, bottomNavItems, products } = home
  const { token } = useSelector((state) => state.auth)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [productId])

  const product = useMemo(() => {
    // Priority 1: Check main products list (live updated)
    const inMainList = products?.find(p => String(p.id || p._id) === String(productId))
    if (inMainList) return inMainList

    // Priority 2: Check recommendation rows (static/fallback)
    let found = null
    recommendationRows.forEach((row) => {
      // Avoid breaking loop if already found
      if (found) return
      const match = row.products.find((prod) => String(prod.id) === String(productId))
      if (match) {
        found = match
      }
    })
    return found
  }, [recommendationRows, products, productId])

  // Listen for real-time rating updates to keep Redux store in sync
  useEffect(() => {
    let socket = getSocket()

    if (!socket || !socket.connected) {
      socket = initSocket(token)
    }

    if (!socket) return

    const handleRatingUpdate = (data) => {
      if (data && data.product_id && data.rating_stats) {
        const targetId = String(data.product_id)

        // Only proceed if we have products loaded
        if (!products || products.length === 0) return

        const currentProducts = products
        let hasChanges = false

        const updatedProducts = currentProducts.map((p) => {
          if (String(p.id || p._id) === targetId) {
            hasChanges = true
            return {
              ...p,
              rating: data.rating_stats.average_rating,
              total_ratings: data.rating_stats.total_ratings
            }
          }
          return p
        })

        if (hasChanges) {
          dispatch(setHomeProducts(updatedProducts))
        }

        // Also update the current view if it's the product being viewed (though memo handles this via products dependency)
        // The memoized 'product' will update automatically because 'products' changed
      }
    }

    const handleProductUpdate = (updatedProduct) => {
      if (updatedProduct && updatedProduct.id) {
        dispatch(updateProductInCache(updatedProduct))
      }
    }

    socket.on('rating_updated', handleRatingUpdate)
    socket.on('product_updated', handleProductUpdate)

    return () => {
      if (socket) {
        socket.off('rating_updated', handleRatingUpdate)
        socket.off('product_updated', handleProductUpdate)
      }
    }
  }, [token, dispatch, products])

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900 pb-20 lg:pb-16">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 lg:pb-16">
        <button
          onClick={() => navigate(-1)}
          className="text-xs sm:text-sm font-semibold text-amber-600 mb-3 sm:mb-4"
        >
          ← Back to results
        </button>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full">
          <div className="space-y-3 sm:space-y-4 w-full">
            {activeImage && (
              <div className="w-full overflow-hidden">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-[280px] sm:h-[360px] md:h-[480px] object-cover"
                />
              </div>
            )}
            {imageList.length > 1 && (
              <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-4 overflow-x-auto pb-2">
                {imageList.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0 rounded-lg sm:rounded-xl border-2 overflow-hidden ${idx === activeImageIndex ? 'border-amber-500' : 'border-transparent'
                      }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4 w-full">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm uppercase tracking-wide text-slate-500">{product.brand}</p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 capitalize">{product.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{product.rating}★</span>
                <span>{product.reviews} ratings</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900">{product.price}</span>
                <span className="line-through text-sm sm:text-base text-slate-400">{product.mrp}</span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-600">{product.discount}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">inclusive of all taxes</p>
              <p className="text-xs sm:text-sm text-slate-700 mt-1">or ₹{Math.ceil(parseFloat(product.price.replace(/[^\d.]/g, '')) / 6)} /month</p>
            </div>

            {product.sizes?.length ? (
              <div>
                <p className="text-xs sm:text-sm font-semibold mb-2">Select size</p>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 border rounded-full bg-slate-50 text-slate-700"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:gap-3 pt-2">
              <button className="w-full px-4 py-2.5 sm:py-3 bg-emerald-700 text-white text-sm sm:text-base font-semibold rounded-full shadow hover:bg-emerald-600 transition">
                Buy Now
              </button>
              <button className="w-full px-4 py-2.5 sm:py-3 rounded-full border border-gray-300 text-sm sm:text-base font-semibold text-gray-800 hover:bg-gray-50 transition">
                Add to bag
              </button>
            </div>

            {product.highlights?.length ? (
              <div>
                <p className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">Highlights</p>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-0.5 sm:space-y-1">
                  {product.highlights.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {product.description ? (
              <div>
                <p className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">Description</p>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{product.description}</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <section className="w-full px-3 sm:px-4 lg:px-8 pb-20 lg:pb-16">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">You might also like</h3>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {relatedProducts.map((item) => (
            <ProductCard
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              image={item.image}
              product={item}
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


