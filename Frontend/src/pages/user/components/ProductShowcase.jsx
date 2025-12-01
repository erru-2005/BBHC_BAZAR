import PropTypes from 'prop-types'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { FaHeart, FaStar, FaStarHalfAlt, FaShoppingBag } from 'react-icons/fa'
import { motionVariants, transitions } from '../../../utils/animations'
import { addToBag } from '../../../services/api'

const getImageSrc = (image) => image?.preview || image?.data_url || image?.url || image || null

const defaultRating = 4.4
const defaultReviews = 120

function ProductShowcase({ products = [], loading, error }) {
  const [likedIds, setLikedIds] = useState(new Set())
  const [addingToBag, setAddingToBag] = useState(new Set())
  const navigate = useNavigate()
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const toggleLike = (event, productId) => {
    event.preventDefault()
    event.stopPropagation()
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
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
          const rating = Number(product.rating) || defaultRating
          const reviews = product.reviews || defaultReviews
          const productId = product.id || product._id || `${product.product_name}-${index}`

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
                    likedIds.has(productId)
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                  onClick={(event) => toggleLike(event, productId)}
                  aria-label="Add to wishlist"
                >
                  <FaHeart className={`w-4 h-4 ${likedIds.has(productId) ? 'fill-current' : ''}`} />
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
                </div>
                {/* Action: Add to Bag (replaces monthly offers/promo line) */}
                <div className="pt-1">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const productId = product.id || product._id;
                      if (!productId) return;
                      
                      if (!isAuthenticated || userType !== 'user') {
                        navigate('/user/phone-entry', {
                          state: {
                            returnTo: `/product/public/${productId}`,
                            message: 'Please login to add items to your bag.'
                          }
                        });
                        return;
                      }
                      
                      try {
                        setAddingToBag(prev => new Set(prev).add(productId));
                        await addToBag(productId, 1);
                        // Optional: Show success message
                      } catch (error) {
                        alert(error.message || 'Failed to add to bag');
                      } finally {
                        setAddingToBag(prev => {
                          const next = new Set(prev);
                          next.delete(productId);
                          return next;
                        });
                      }
                    }}
                    disabled={addingToBag.has(product.id || product._id)}
                    aria-label="Add to bag"
                  >
                    <FaShoppingBag className="w-4 h-4 text-pink-500" />
                    {addingToBag.has(product.id || product._id) ? 'Adding...' : 'Add to Bag'}
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <FaStar className="w-3.5 h-3.5" />
                  <FaStar className="w-3.5 h-3.5" />
                  <FaStar className="w-3.5 h-3.5" />
                  <FaStar className="w-3.5 h-3.5" />
                  <FaStarHalfAlt className="w-3.5 h-3.5" />
                  <span className="text-[11px] text-gray-600 ml-1">{rating.toFixed(1)} ({reviews} reviews)</span>
                </div>
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


