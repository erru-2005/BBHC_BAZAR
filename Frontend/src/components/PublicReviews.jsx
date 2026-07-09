import { useEffect, useState } from 'react'
import { FaStar } from 'react-icons/fa'
import { getProductRatings } from '../services/api'

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

  return (
    <div className="space-y-4">
      {reviews.map((review, idx) => (
        <div
          key={review.id || idx}
          className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Star display */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={`w-3.5 h-3.5 ${star <= (review.rating || 0) ? 'text-yellow-400' : 'text-slate-200'}`}
                />
              ))}
              <span className="ml-1.5 text-xs font-bold text-slate-600">{review.rating}.0</span>
            </div>
            {/* Date */}
            {review.created_at && (
              <span className="text-[10px] text-slate-400 font-medium shrink-0">
                {new Date(review.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </span>
            )}
          </div>
          {/* Review text */}
          {review.review_text && (
            <p className="text-sm text-slate-700 leading-relaxed">{review.review_text}</p>
          )}
          {/* Anonymous reviewer */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verified Buyer</p>
        </div>
      ))}
    </div>
  )
}

export default PublicReviews
