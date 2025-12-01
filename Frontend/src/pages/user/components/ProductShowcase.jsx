import PropTypes from 'prop-types'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { FaHeart, FaStar, FaStarHalfAlt, FaShoppingBag, FaMinus, FaPlus } from 'react-icons/fa'
import { motionVariants, transitions } from '../../../utils/animations'
import { addToBag, getBag, updateBagItem, removeFromBag, addToWishlist, removeFromWishlist, getProductRatingStats } from '../../../services/api'
import RatingBadge from '../../../components/RatingBadge'

const getImageSrc = (image) => image?.preview || image?.data_url || image?.url || image || null

function ProductShowcase({ products = [], loading, error }) {
  const [addingToBag, setAddingToBag] = useState(new Set())
  const [bagItemsByProduct, setBagItemsByProduct] = useState({})
  const [wishlistLoading, setWishlistLoading] = useState(new Set())
  const [ratingStatsMap, setRatingStatsMap] = useState({})
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const { home } = useSelector((state) => state.data)

  const wishlistSet = useMemo(() => {
    if (!home?.wishlist) return new Set()
    return new Set(home.wishlist.map((id) => String(id)))
  }, [home])

  // Load current bag so we know which products are already added
  useEffect(() => {
    const loadBag = async () => {
      if (!isAuthenticated || userType !== 'user') {
        setBagItemsByProduct({})
        return
      }

      try {
        const bagItems = await getBag()
        const map = {}
        bagItems.forEach((item) => {
          const productId =
            item.product_id ||
            item.product?.id ||
            item.product?._id
          if (productId) {
            map[String(productId)] = {
              bagItemId: item.id,
              quantity: item.quantity || 1
            }
          }
        })
        setBagItemsByProduct(map)
      } catch (err) {
        console.error('Failed to load bag for products grid:', err)
      }
    }

    loadBag()
  }, [isAuthenticated, userType])

  // Load rating stats for all visible products so cards always reflect DB averages
  useEffect(() => {
    const loadStats = async () => {
      if (!products?.length) {
        setRatingStatsMap({})
        return
      }
      try {
        const entries = await Promise.all(
          products.map(async (p) => {
            const id = p.id || p._id
            if (!id) return null
            try {
              const stats = await getProductRatingStats(id)
              return { id: String(id), stats }
            } catch {
              return null
            }
          })
        )
        const map = {}
        entries.forEach((entry) => {
          if (entry && entry.stats && entry.stats.average_rating !== undefined) {
            map[entry.id] = entry.stats
          }
        })
        setRatingStatsMap(map)
      } catch {
        // ignore stats errors, UI will just show "No reviews yet"
      }
    }

    loadStats()
  }, [products])

  const toggleLike = async (event, productId) => {
    event.preventDefault()
    event.stopPropagation()
    const idStr = String(productId)

    if (wishlistLoading.has(idStr)) return

    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/phone-entry', {
        state: {
          returnTo: `/product/public/${idStr}`,
          message: 'Please login to manage your wishlist.'
        }
      })
      return
    }

    const alreadyLiked = wishlistSet.has(idStr)

    // Show loader on this heart
    setWishlistLoading((prev) => {
      const next = new Set(prev)
      next.add(idStr)
      return next
    })

    // Optimistic update in Redux
    dispatch({ type: 'data/toggleWishlist', payload: idStr })

    try {
      if (alreadyLiked) {
        await removeFromWishlist(idStr)
      } else {
        await addToWishlist(idStr)
      }
    } catch (error) {
      // Revert on error
      dispatch({ type: 'data/toggleWishlist', payload: idStr })
      alert(error.message || 'Failed to update wishlist')
    } finally {
      setWishlistLoading((prev) => {
        const next = new Set(prev)
        next.delete(idStr)
        return next
      })
    }
  }

  const handleCardClick = (product) => {
    const id = product.id || product._id
    if (!id) return
    navigate(`/product/public/${id}`, { state: { product } })
  }

  if (error) {
    return (
      <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={`product-skeleton-${index}`} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 animate-pulse">
            <div className="h-40 rounded-2xl bg-gray-200" />
            <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
            <div className="h-3 w-1/2 bg-gray-200 rounded-full" />
            <div className="h-3 w-1/3 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!products.length) {
    return null
  }

  return (
    <section className="mt-12">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-widest text-gray-500">Fresh arrivals</p>
        <h2 className="text-3xl font-black text-gray-900">Trending products</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product, index) => {
          const thumbnail = product.thumbnail || product.media?.thumbnail
          const sellingPrice = Number(product.selling_price || product.price || product.max_price || 0)
          const maxPrice = Number(product.max_price || product.selling_price || product.price || sellingPrice)
          const discountPercentage =
            sellingPrice && maxPrice && maxPrice > sellingPrice
              ? Math.round(((maxPrice - sellingPrice) / maxPrice) * 100)
              : null
          const productId = product.id || product._id || `${product.product_name}-${index}`
          const productIdStr = String(productId)
          const stats = ratingStatsMap[productIdStr]
          const hasRating = stats && stats.average_rating !== undefined && stats.total_ratings !== undefined
          const rating = hasRating ? Number(stats.average_rating) : null
          const reviews = hasRating ? Number(stats.total_ratings || 0) : 0
          const bagInfo = bagItemsByProduct[productIdStr]
          const isLiked = wishlistSet.has(productIdStr)

          return (
            <motion.article
              key={productId}
              className="group rounded-[28px] border border-gray-200 bg-white p-3 flex flex-col gap-3 hover:shadow-lg transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-black"
              initial={motionVariants.fadeIn.initial}
              whileInView={motionVariants.fadeIn.animate}
              viewport={{ once: true }}
              transition={{ ...transitions.smooth, delay: index * 0.05 }}
              onClick={() => handleCardClick(product)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCardClick(product)
                }
              }}
            >
              <div className="relative rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden aspect-[4/3] flex items-center justify-center">
                {getImageSrc(thumbnail) ? (
                  <img
                    src={getImageSrc(thumbnail)}
                    alt={product.product_name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-xs text-gray-400">No image</div>
                )}
                <button
                  className={`absolute top-3 right-3 p-1.5 rounded-full border ${
                    isLiked
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                  onClick={(event) => toggleLike(event, productIdStr)}
                  aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
                  disabled={wishlistLoading.has(productIdStr)}
                >
                  {wishlistLoading.has(productIdStr) ? (
                    <span className="block w-4 h-4 border-2 border-t-transparent border-red-400 rounded-full animate-spin" />
                  ) : (
                    <FaHeart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>

              <div className="flex-1 space-y-1">
              
                <h3 className="text-base font-semibold text-gray-900 line-clamp-2 min-h-[48px]">{product.product_name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-black text-gray-900">₹{sellingPrice.toLocaleString('en-IN')}</p>
                  {maxPrice > sellingPrice && (
                    <span className="text-xs text-gray-500 line-through">₹{maxPrice.toLocaleString('en-IN')}</span>
                  )}
                  {discountPercentage && (
                    <span className="text-xs font-semibold text-green-600">↓{discountPercentage}%</span>
                  )}
                  {rating !== null && rating > 0 && (
                    <span className="ml-auto">
                      <RatingBadge
                        value={rating}
                        displayValue={rating.toFixed(1)}
                        size="sm"
                      />
                    </span>
                  )}
                </div>
                {/* Action: Add to Bag / Quantity controls */}
                <div className="pt-1">
                  {bagInfo ? (
                    <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
                      <button
                        className="p-1.5 text-gray-600 hover:text-gray-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()

                          const newQty = (bagInfo.quantity || 1) - 1

                          // Optimistic update
                          setBagItemsByProduct((prev) => {
                            const next = { ...prev }
                            if (newQty <= 0) {
                              delete next[String(productId)]
                            } else {
                              next[String(productId)] = {
                                ...bagInfo,
                                quantity: newQty
                              }
                            }
                            return next
                          })

                          try {
                            if (newQty <= 0) {
                              await removeFromBag(bagInfo.bagItemId)
                            } else {
                              await updateBagItem(bagInfo.bagItemId, newQty)
                            }
                          } catch (error) {
                            alert(error.message || 'Failed to update quantity')
                          }
                        }}
                        aria-label="Decrease quantity"
                      >
                        <FaMinus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm font-semibold min-w-[2.5rem] text-center">
                        {bagInfo.quantity}
                      </span>
                      <button
                        className="p-1.5 text-gray-600 hover:text-gray-900 transition"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()

                          const newQty = (bagInfo.quantity || 1) + 1

                          // Optimistic update
                          setBagItemsByProduct((prev) => ({
                            ...prev,
                            [String(productId)]: {
                              ...bagInfo,
                              quantity: newQty
                            }
                          }))

                          try {
                            await updateBagItem(bagInfo.bagItemId, newQty)
                          } catch (error) {
                            alert(error.message || 'Failed to update quantity')
                          }
                        }}
                        aria-label="Increase quantity"
                      >
                        <FaPlus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                  <button
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const effectiveId = product.id || product._id
                        if (!effectiveId) return

                        if (!isAuthenticated || userType !== 'user') {
                          navigate('/user/phone-entry', {
                            state: {
                              returnTo: `/product/public/${effectiveId}`,
                              message: 'Please login to add items to your bag.'
                            }
                          })
                          return
                        }

                        try {
                          setAddingToBag((prev) => {
                            const next = new Set(prev)
                            next.add(effectiveId)
                            return next
                          })
                          const bagItem = await addToBag(effectiveId, 1)

                          if (bagItem) {
                            const bagProductId =
                              bagItem.product_id ||
                              bagItem.product?.id ||
                              effectiveId

                            setBagItemsByProduct((prev) => ({
                              ...prev,
                              [String(bagProductId)]: {
                                bagItemId: bagItem.id,
                                quantity: bagItem.quantity || 1
                              }
                            }))
                          }
                        } catch (error) {
                          alert(error.message || 'Failed to add to bag')
                        } finally {
                          setAddingToBag((prev) => {
                            const next = new Set(prev)
                            next.delete(effectiveId)
                            return next
                          })
                        }
                      }}
                      disabled={addingToBag.has(product.id || product._id)}
                    aria-label="Add to bag"
                  >
                    <FaShoppingBag className="w-4 h-4 text-pink-500" />
                      {addingToBag.has(product.id || product._id) ? 'Adding...' : 'Add to Bag'}
                  </button>
                  )}
                </div>
                {rating !== null && rating > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    {Array.from({ length: 5 }, (_, i) => {
                      const index = i + 1
                      const fullStars = Math.floor(rating)
                      const fraction = rating - fullStars
                      const hasHalf = fraction > 0 // treat any fraction as half for display

                      if (index <= fullStars) {
                        // Fully filled star
                        return <FaStar key={index} className="w-3.5 h-3.5" />
                      }
                      if (index === fullStars + 1 && hasHalf) {
                        // Partially filled star (half icon)
                        return <FaStarHalfAlt key={index} className="w-3.5 h-3.5" />
                      }
                      // Empty star
                      return <FaStar key={index} className="w-3.5 h-3.5 text-gray-300" />
                    })}
                    <span className="text-[11px] text-gray-600 ml-1">
                      {rating.toFixed(1)} ({reviews} reviews)
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500">No reviews yet</div>
                )}
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

ProductShowcase.propTypes = {
  products: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.string
}

export default ProductShowcase


