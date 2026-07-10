import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FaStar, FaBox } from 'react-icons/fa6'
import { getSellerRatings } from '../../../services/api'
import { motion } from 'framer-motion'

function SellerReviews() {
  const { user } = useSelector((state) => state.auth)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.id) return
      try {
        setLoading(true)
        const data = await getSellerRatings(user.id)
        setReviews(data.ratings || [])
      } catch (err) {
        setError(err.message || 'Failed to load reviews')
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mr-3"></div>
        Loading reviews...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center text-red-500 bg-red-50 rounded-xl">
        <p className="font-semibold">{error}</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-100 mt-4 mx-4 md:mx-auto max-w-4xl">
        <FaStar className="w-12 h-12 text-slate-200 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">No Reviews Yet</h3>
        <p className="text-sm mt-1 text-center">Customers haven't reviewed any of your products yet.</p>
      </div>
    )
  }

  const averageRating = (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Reviews</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Feedback from your customers</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-yellow-400">
            <FaStar className="w-6 h-6" />
            <span className="text-2xl font-black text-slate-900">{averageRating}</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{reviews.length} Total Reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={review.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase text-xs">
                    {review.user_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none">{review.user_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-1 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FaStar key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'opacity-100' : 'opacity-20 text-slate-400'}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                "{review.review_text || 'No comments provided.'}"
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 bg-slate-50 rounded-lg p-2">
              <FaBox className="text-slate-400 w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold text-slate-700 truncate">{review.product_name}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default SellerReviews
