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
import { getProducts, addToBag } from '../../services/api'
import { FaHeart, FaShoppingBag, FaMinus, FaPlus } from 'react-icons/fa'
import StarRating from '../../components/StarRating'
import RatingBadge from '../../components/RatingBadge'
import { addToWishlist, removeFromWishlist, getProductRatingStats } from '../../services/api'
import useProductSocket from '../../hooks/useProductSocket'

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
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const productFromStore = home.products?.find((prod) => String(prod.id || prod._id) === productId)
  const [product, setProduct] = useState(location.state?.product || productFromStore)
  const [userRating, setUserRating] = useState(0)
  const [addingToBag, setAddingToBag] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const wishlistIds = home.wishlist || []
  const isWishlisted = product ? wishlistIds.includes(String(product.id || product._id)) : false
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [ratingStats, setRatingStats] = useState(null)

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

  // Load rating statistics from backend so detail page always shows real averages & counts
  useEffect(() => {
    const id = productId
    if (!id) return

    const loadStats = async () => {
      try {
        const stats = await getProductRatingStats(id)
        setRatingStats(stats || null)
      } catch {
        setRatingStats(null)
      }
    }

    loadStats()
  }, [productId])

  useProductSocket((updatedProduct) => {
    if (
      updatedProduct &&
      product &&
      String(updatedProduct.id || updatedProduct._id) === String(product.id || product._id)
    ) {
      setProduct(updatedProduct)
    }
  })

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900 pb-20 lg:pb-16">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-black transition-colors"
        >
          ← Back
        </button>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full items-start">
          <ProductMediaViewer thumbnail={product.thumbnail} gallery={product.gallery} productName={product.product_name} />

          <div className="space-y-4 sm:space-y-5 lg:space-y-6 w-full">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500">Product</p>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight capitalize mt-1">{product.product_name}</h1>
                  {product.categories && (
                    <span className="inline-flex items-center gap-2 mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-100 text-xs sm:text-sm font-semibold text-gray-700">
                      {Array.isArray(product.categories) ? product.categories[0] : product.categories}
                    </span>
                  )}
                </div>
                <button
                  className={`flex-shrink-0 p-2 sm:p-2.5 rounded-full border transition-colors ${
                    isWishlisted
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  onClick={async () => {
                    if (!product) return
                    const currentId = String(product.id || product._id)
                    if (!isAuthenticated || userType !== 'user') {
                      navigate('/user/phone-entry', {
                        state: {
                          returnTo: `/product/public/${productId}`,
                          message: 'Please login to manage your wishlist.'
                        }
                      })
                      return
                    }

                    if (wishlistLoading) return

                    // Optimistic toggle
                    dispatch({ type: 'data/toggleWishlist', payload: currentId })
                    setWishlistLoading(true)
                    try {
                      if (isWishlisted) {
                        await removeFromWishlist(currentId)
                      } else {
                        await addToWishlist(currentId)
                      }
                    } catch (error) {
                      // Revert on error
                      dispatch({ type: 'data/toggleWishlist', payload: currentId })
                      alert(error.message || 'Failed to update wishlist')
                    } finally {
                      setWishlistLoading(false)
                    }
                  }}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? (
                    <span className="block w-5 h-5 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                  ) : (
                    <FaHeart className={`w-5 h-5 sm:w-6 sm:h-6 ${isWishlisted ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>
            </div>

            {(product.selling_price || product.max_price) && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <p className="text-2xl sm:text-3xl font-black text-gray-900">{formatCurrency(product.selling_price || product.max_price)}</p>
                  {discount && <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-bold">{discount}% OFF</span>}
                </div>
                {product.selling_price && product.max_price && discount && (
                  <p className="text-xs sm:text-sm text-gray-500">
                    MRP: <span className="line-through">{formatCurrency(product.max_price)}</span>
                  </p>
                )}
                {ratingStats && ratingStats.average_rating && ratingStats.total_ratings > 0 && (
                  <div className="pt-1 flex items-center gap-2">
                    <RatingBadge
                      value={Number(ratingStats.average_rating)}
                      displayValue={Number(ratingStats.average_rating).toFixed(1)}
                      size="sm"
                    />
                    <span className="text-[11px] sm:text-xs text-gray-600">
                      ({ratingStats.total_ratings} reviews)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 mb-1.5 sm:mb-2">Specification</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.specification}</p>
            </div>

            {product.points?.length > 0 && (
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 mb-1.5 sm:mb-2">Highlights</p>
                <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                  {product.points.map((point, idx) => (
                    <li key={`${product.id}-point-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-2">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 mb-2 sm:mb-3">Quantity</p>
              <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
                <button
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="p-2 sm:p-2.5 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Decrease quantity"
                >
                  <FaMinus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <span className="px-4 sm:px-6 font-semibold text-base sm:text-lg min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => {
                    const maxQty = Number(product.quantity || product.stock || 10)
                    setQuantity((prev) => Math.min(maxQty, prev + 1))
                  }}
                  className="p-2 sm:p-2.5 text-gray-600 hover:text-gray-900 transition"
                  aria-label="Increase quantity"
                >
                  <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 pt-2">
              <button
                onClick={() => {
                  if (!product) return
                  if (!isAuthenticated || userType !== 'user') {
                    navigate('/user/phone-entry', {
                      state: {
                        returnTo: `/product/${productId}/buy`,
                        message: 'Please login to complete your purchase.'
                      }
                    })
                    return
                  }
                  navigate(`/product/${productId}/buy`, { state: { product } })
                }}
                disabled={!product}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-emerald-700 text-white text-sm sm:text-base font-semibold rounded-full shadow hover:bg-emerald-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
              <button
                onClick={async () => {
                  if (!product) return
                  if (!isAuthenticated || userType !== 'user') {
                    navigate('/user/phone-entry', {
                      state: {
                        returnTo: `/product/public/${productId}`,
                        message: 'Please login to add items to your bag.'
                      }
                    })
                    return
                  }
                  try {
                    setAddingToBag(true)
                    await addToBag(product.id || product._id, quantity)
                    alert('Item added to bag successfully!')
                    setQuantity(1) // Reset quantity after adding
                  } catch (error) {
                    alert(error.message || 'Failed to add to bag')
                  } finally {
                    setAddingToBag(false)
                  }
                }}
                disabled={!product || addingToBag}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-full border border-gray-300 text-sm sm:text-base font-semibold text-gray-800 hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <FaShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                {addingToBag ? 'Adding...' : 'Add to bag'}
              </button>
              
              {/* Star Rating Panel */}
              <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Rate this product</p>
                <StarRating
                  totalStars={5}
                  initialRating={userRating}
                  productId={productId}
                  onRatingChange={(rating) => {
                    setUserRating(rating)
                  }}
                  showRatingText={true}
                  disabled={false}
                  size="md"
                  showStats={true}
                />
              </div>
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


