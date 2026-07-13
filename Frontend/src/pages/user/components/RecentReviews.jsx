import { useState, useEffect, useRef } from 'react'
import { FaStar, FaUserCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { getRecentRatings } from '../../../services/api'
import { getImageUrl } from '../../../utils/image'

function RecentReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getRecentRatings(20, 0)
        if (data && data.ratings) {
          setReviews(data.ratings)
        }
      } catch (err) {
        console.error('Failed to fetch recent reviews', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [])

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

  if (loading || reviews.length === 0) {
    return null
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-white overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Customer Reviews
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              See what our customers are saying
            </p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={scrollLeft}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              aria-label="Scroll left"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              aria-label="Scroll right"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review, index) => (
            <div 
              key={review.id || index}
              className="flex-none w-[280px] sm:w-[320px] bg-gray-50 rounded-2xl p-6 snap-center border border-gray-100 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {review.user_image ? (
                      <img 
                        src={getImageUrl(review.user_image)} 
                        alt={review.user_name} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <FaUserCircle className="w-10 h-10 text-gray-300" />
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{review.user_name}</h4>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]" title={review.product_name}>
                        {review.product_name}
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-4">
                  "{review.review_text}"
                </p>
              </div>

              <div className="flex items-center gap-1 mt-auto pt-4 border-t border-gray-200">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar 
                    key={star} 
                    className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </section>
  )
}

export default RecentReviews
