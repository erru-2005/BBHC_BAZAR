import { useEffect, useState, useRef } from 'react'
import { FaStar, FaUserCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { getProductRatings } from '../services/api'
import { getImageUrl } from '../utils/image'

/**
 * PublicReviews - Shows all reviews for a product or service to any visitor.
 * Props:
 *   itemId (string) - the product or service ID
 *   label (string) - optional label e.g. "Product" or "Service"
 */
function PublicReviews({ itemId, label = 'Item' }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    if (!itemId) return
    setLoading(true)
    setError(null)
    getProductRatings(itemId, 50, 0)
      .then((data) => {
        // filter to only those with a review_text
        const withText = (Array.isArray(data) ? data : [])
          .filter((r) => r && (r.review_text || r.rating))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        setReviews(withText)
      })
      .catch((e) => {
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [itemId])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-xs text-slate-400 text-center py-4">Could not load reviews.</p>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <FaStar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No reviews yet. Be the first to review this {label.toLowerCase()}!</p>
      </div>
    )
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Customer Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={scrollLeft}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Scroll left"
            >
              <FaChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={scrollRight}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Scroll right"
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reviews.map((review, idx) => (
          <div
            key={review.id || idx}
            className="flex-none w-[280px] sm:w-[320px] bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col justify-between snap-center"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {review.user_image ? (
                    <img 
                      src={getImageUrl(review.user_image)} 
                      alt={review.user_name || 'User'} 
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <FaUserCircle className="w-8 h-8 text-gray-300" />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[120px]">
                      {review.user_name || 'Anonymous User'}
                    </h4>
                    {review.created_at && (
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {review.review_text && (
                <p className="text-sm text-slate-700 leading-relaxed mb-4 line-clamp-4">
                  "{review.review_text}"
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1 pt-3 border-t border-slate-100 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`w-3.5 h-3.5 ${star <= (review.rating || 0) ? 'text-yellow-400' : 'text-slate-200'}`}
                  />
                ))}
                <span className="ml-1.5 text-xs font-bold text-slate-600">{review.rating}.0</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified Buyer</p>
            </div>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  )
}

export default PublicReviews
