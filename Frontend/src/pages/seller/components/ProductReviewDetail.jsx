import { motion } from 'framer-motion'
import { FaStar, FaBox, FaConciergeBell, FaArrowLeft, FaUser, FaStore } from 'react-icons/fa'

/**
 * ProductReviewDetail
 * Reusable page that shows all reviews for a single product/service.
 *
 * Props:
 *   group   – { product_id, product_name, item_type, reviews[] }
 *   onBack  – callback to return to the list
 */
function ProductReviewDetail({ group, onBack }) {
  if (!group) return null

  const avgRating = (
    group.reviews.reduce((sum, r) => sum + r.rating, 0) / (group.reviews.length || 1)
  ).toFixed(1)

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: group.reviews.filter((r) => r.rating === star).length,
  }))

  const isService = group.item_type === 'service'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${isService ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500'}`}>
              {isService ? <FaConciergeBell className="w-4 h-4" /> : <FaBox className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-800 truncate">
                {group.product_name || 'Product Reviews'}
              </h1>
              <p className="text-xs text-slate-400 capitalize">{group.item_type}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center">
            {/* Big Rating */}
            <div className="flex flex-col items-center justify-center bg-yellow-50 rounded-2xl px-6 py-4 border border-yellow-100 shrink-0">
              <span className="text-4xl sm:text-5xl font-black text-slate-900">{avgRating}</span>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <FaStar
                    key={s}
                    className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'text-yellow-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">{group.reviews.length} reviews</p>
            </div>

            {/* Rating Breakdown */}
            <div className="flex-1 w-full space-y-1.5">
              {ratingCounts.map(({ star, count }) => {
                const pct = group.reviews.length > 0 ? Math.round((count / group.reviews.length) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 w-3 text-right">{star}</span>
                    <FaStar className="w-3 h-3 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-7 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Reviews List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">All Reviews</h2>
          {group.reviews.map((review, i) => (
            <motion.div
              key={review.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5"
            >
              {/* Reviewer Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold uppercase text-sm shrink-0">
                    {review.user_name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                      {review.user_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(review.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                {/* Star Rating */}
                <div className="flex gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Comment */}
              {review.review_text ? (
                <p className="mt-3 text-sm text-slate-700 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                  "{review.review_text}"
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-400 italic pl-3">No written comment.</p>
              )}

              {/* Meta Footer */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                {review.seller_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FaStore className="w-3 h-3 text-slate-400" />
                    <span>{review.seller_name}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProductReviewDetail
