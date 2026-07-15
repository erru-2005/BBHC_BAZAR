import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FaStar, FaBox, FaConciergeBell, FaChevronRight } from 'react-icons/fa'
import { getAllRatings } from '../../../services/api'
import { motion } from 'framer-motion'
import ProductReviewDetail from './ProductReviewDetail'

function MasterReviews() {
  const { token } = useSelector((state) => state.auth)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryTab, setCategoryTab] = useState('all') // 'all', 'product', 'service'
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Pagination
  const [limit] = useState(50)
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

  // Navigate to detail view
  if (selectedGroup) {
    return (
      <ProductReviewDetail
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
      />
    )
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

  const filteredReviews = reviews.filter(r => {
    const type = r.item_type || 'product' // treat missing as product
    return categoryTab === 'all' || type === categoryTab
  })

  const groupedReviews = Object.values(filteredReviews.reduce((acc, review) => {
    const key = review.product_id
    if (!acc[key]) {
      acc[key] = {
        product_id: review.product_id,
        product_name: review.product_name,
        item_type: review.item_type || 'product', // default
        reviews: []
      }
    }
    acc[key].reviews.push({ ...review, item_type: review.item_type || 'product' })
    return acc
  }, {}))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">System Reviews & Ratings</h1>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">Monitor all customer feedback across the platform</p>
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl border border-yellow-100 self-start sm:self-auto">
              <FaStar className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-sm">{reviews.length} Reviews Loaded</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {['all', 'product', 'service'].map((tab) => (
              <button
                key={tab}
                onClick={() => setCategoryTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap shrink-0 ${
                  categoryTab === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3">
        {groupedReviews.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
            <FaStar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No Reviews Yet</h3>
            <p className="text-sm mt-1">No reviews found for the selected category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {groupedReviews.map((group, i) => {
              const avgRating = (group.reviews.reduce((sum, r) => sum + r.rating, 0) / group.reviews.length).toFixed(1)
              const isService = group.item_type === 'service'
              return (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % limit) * 0.03 }}
                  key={group.product_id || i}
                  onClick={() => setSelectedGroup(group)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  {/* Icon */}
                  <div className={`p-3 rounded-xl shrink-0 ${isService ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500'}`}>
                    {isService ? <FaConciergeBell className="w-5 h-5" /> : <FaBox className="w-5 h-5" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {group.product_name || group.product_id}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {group.item_type}
                      </span>
                      <span className="text-xs text-slate-500">{group.reviews.length} review{group.reviews.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Rating + Arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg border border-yellow-100">
                      <FaStar className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-sm font-bold">{avgRating}</span>
                    </div>
                    <FaChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </motion.button>
              )
            })}
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
    </div>
  )
}

export default MasterReviews
