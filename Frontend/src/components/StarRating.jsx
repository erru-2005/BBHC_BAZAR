import { useState } from 'react'
import { FaStar } from 'react-icons/fa'
import PropTypes from 'prop-types'

/**
 * StarRating Component
 * A reusable, professional star rating UI component for React
 * 
 * Features:
 * - Configurable total stars (default: 5)
 * - Gold selected stars, light grey unselected
 * - Smooth hover effects
 * - Click to set rating
 * - Rating text display
 * - Disabled mode support
 * - Tooltip text for each star level
 * - Scale animation on hover
 */
function StarRating({
  totalStars = 5,
  initialRating = 0,
  onRatingChange,
  showRatingText = true,
  disabled = false,
  size = 'md',
  className = ''
}) {
  const [rating, setRating] = useState(initialRating)
  const [hoveredStar, setHoveredStar] = useState(0)

  // Star level tooltips
  const starTooltips = {
    1: 'Poor',
    2: 'Below Average',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }

  // Size configurations - responsive for mobile and desktop
  const sizeConfig = {
    sm: { 
      icon: 14, 
      iconMobile: 12,
      text: 'text-xs',
      padding: 'p-2 sm:p-2.5'
    },
    md: { 
      icon: 20, 
      iconMobile: 18,
      text: 'text-sm sm:text-base',
      padding: 'p-3 sm:p-4'
    },
    lg: { 
      icon: 28, 
      iconMobile: 24,
      text: 'text-base sm:text-lg',
      padding: 'p-4 sm:p-5'
    }
  }

  const config = sizeConfig[size] || sizeConfig.md

  /**
   * Handle star click
   * Sets the rating and calls the onChange callback if provided
   */
  const handleStarClick = (starValue) => {
    if (disabled) return
    
    setRating(starValue)
    if (onRatingChange) {
      onRatingChange(starValue)
    }
  }

  /**
   * Handle star hover
   * Highlights stars on hover for better UX
   */
  const handleStarHover = (starValue) => {
    if (disabled) return
    setHoveredStar(starValue)
  }

  /**
   * Handle mouse leave
   * Resets hover state when mouse leaves the star area
   */
  const handleMouseLeave = () => {
    if (disabled) return
    setHoveredStar(0)
  }

  /**
   * Get star color based on state
   * - Gold for selected stars
   * - Brighter gold for hovered stars
   * - Light grey for unselected stars
   */
  const getStarColor = (starValue) => {
    if (disabled) {
      return starValue <= rating ? '#FFC107' : '#D1D5DB'
    }
    
    const activeStar = hoveredStar || rating
    if (starValue <= activeStar) {
      // Hovered stars get a slightly brighter gold
      return hoveredStar >= starValue ? '#FFD54F' : '#FFC107'
    }
    return '#D1D5DB'
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col items-center sm:items-start gap-3 sm:gap-4">
          {/* Stars Section - Centered on mobile, left-aligned on desktop */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <div
                className="flex items-center gap-1 sm:gap-1.5"
                onMouseLeave={handleMouseLeave}
                role={disabled ? 'img' : 'radiogroup'}
                aria-label={disabled ? `Rating: ${rating} out of ${totalStars}` : 'Star rating'}
              >
                {Array.from({ length: totalStars }, (_, index) => {
                  const starValue = index + 1
                  const isActive = starValue <= (hoveredStar || rating)
                  
                  return (
                    <button
                      key={starValue}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStarClick(starValue)}
                      onMouseEnter={() => handleStarHover(starValue)}
                      className={`
                        ${disabled ? 'cursor-default' : 'cursor-pointer'}
                        transition-all duration-200 ease-in-out
                        ${!disabled && 'hover:scale-125 active:scale-110'}
                        focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 rounded-full
                        disabled:opacity-60
                        p-0.5 sm:p-1
                        flex-shrink-0
                      `}
                      aria-label={`Rate ${starValue} out of ${totalStars} stars`}
                      title={!disabled ? starTooltips[starValue] || '' : ''}
                    >
                      <FaStar
                        size={config.icon}
                        className={`
                          transition-all duration-200
                          ${isActive ? 'drop-shadow-md' : ''}
                        `}
                        style={{
                          color: getStarColor(starValue),
                          filter: isActive && !disabled ? 'drop-shadow(0 2px 4px rgba(255, 193, 7, 0.4))' : 'none'
                        }}
                      />
                    </button>
                  )
                })}
              </div>
              
              {/* Rating Text - Next to stars */}
              {showRatingText && (
                <div className="flex items-center gap-1 ml-1 sm:ml-2">
                  <span className={`${config.text} font-bold text-amber-600`}>
                    {rating > 0 ? rating.toFixed(1) : '0.0'}
                  </span>
                  <span className={`${config.text} font-normal text-gray-400`}>
                    / {totalStars}
                  </span>
                </div>
              )}
            </div>

            {/* Tooltip/Helper Text - Below on mobile, next to on desktop */}
            {!disabled && hoveredStar > 0 && (
              <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
                {starTooltips[hoveredStar]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

StarRating.propTypes = {
  totalStars: PropTypes.number,
  initialRating: PropTypes.number,
  onRatingChange: PropTypes.func,
  showRatingText: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  showCard: PropTypes.bool
}

export default StarRating

