import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FaStar, FaBox, FaUser, FaStore } from 'react-icons/fa'
import { getAllRatings } from '../../../services/api'
import { motion } from 'framer-motion'

function MasterReviews() {
  const { token } = useSelector((state) => state.auth)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Pagination
  const [limit, setLimit] = useState(50)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchReviews = async (currentSkip) => {
    try {
      setLoading(true)
      const data = await getAllRatings(limit, currentSkip)
      if (currentSkip === 0) {
        setReviews(data.ratings || [])
      } else {
        setReviews(prev => [...prev, ...(data.ratings || [])])
      }
      setHasMore((data.ratings || []).length === limit)
    } catch (err) {
      setError(err.message || 'Failed to load all reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews(0)
  }, [token, limit])

  const loadMore = () => {
    const newSkip = skip + limit
    setSkip(newSkip)
    fetchReviews(newSkip)
  }

  if (loading && skip === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-100">
        <p className="font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Reviews & Ratings</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monitor all customer feedback across the platform</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl border border-yellow-100">
          <FaStar className="w-5 h-5 text-yellow-500" />
          <span className="font-bold">{reviews.length} Reviews Loaded</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
          <FaStar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Reviews Yet</h3>
          <p className="text-sm mt-1">Customers haven't left any reviews across the platform.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((review, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % limit) * 0.05 }}
              key={review.id || i}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <FaStar className="text-yellow-400 w-4 h-4" />
                  <span className="font-black text-slate-700">{review.rating}/5</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {new Date(review.created_at).toLocaleString()}
                </span>
              </div>
              
              <p className="text-sm text-slate-800 italic leading-relaxed min-h-[3rem]">
                "{review.review_text || 'No written feedback provided.'}"
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <FaUser className="text-slate-400 w-3 h-3 shrink-0" />
                  <span className="truncate">{review.user_name || review.user_id}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <FaStore className="text-slate-400 w-3 h-3 shrink-0" />
                  <span className="truncate">{review.seller_name || review.seller_id}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 bg-blue-50/50 p-1.5 rounded truncate">
                  <FaBox className="text-blue-400 w-3 h-3 shrink-0" />
                  <span className="text-blue-800 truncate">{review.product_name || review.product_id}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-md hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </div>
  )
}

export default MasterReviews
