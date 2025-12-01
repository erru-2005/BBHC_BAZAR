import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { createOrUpdateRating, getMyRating } from '../services/api'
import RatingBadge from './RatingBadge'
/**
 * StarRating Component - Gold Stars with Particle Effects
 * A premium star rating UI with gold glowing stars, smooth animations, and particle effects
 * 
 * Features:
 * - Gold glowing stars
 * - Smooth fill animation
 * - Particle effect on click - small stars release from ALL selected stars
 * - Particles appear from center of each star and fade out slowly
 * - Same card structure
 * - Satisfying and cool animations
 * - Backend integration with authentication
 */
function StarRating({
  totalStars = 5,
  initialRating = 0,
  onRatingChange,
  showRatingText = true,
  disabled = false,
  size = 'md',
  className = '',
  productId = null, // Product ID for backend integration
  showStats = false // Show rating statistics
}) {
  const [rating, setRating] = useState(initialRating)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [particles, setParticles] = useState([])
  const [loading, setLoading] = useState(false)
  const starRefs = useRef({})
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  // Fetch user's existing rating on mount
  useEffect(() => {
    if (productId) {
      // Fetch user's rating if authenticated
      // Check both Redux state and localStorage token
      const hasToken = localStorage.getItem('token')
      if ((isAuthenticated && userType === 'user') || hasToken) {
        getMyRating(productId)
          .then(userRating => {
            if (userRating && userRating.rating) {
              setRating(userRating.rating)
            }
          })
          .catch(err => {
            // Only log if it's not a 401 (which will be handled by refresh)
            // or if refresh also failed (user needs to login)
            if (!err.message?.includes('Authorization token is missing') && 
                !err.message?.includes('Session expired')) {
              console.error('Error fetching user rating:', err)
            }
          })
      }
    }
  }, [productId, isAuthenticated, userType])

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
      padding: 'p-2 sm:p-2.5',
      particleSize: 4
    },
    md: { 
      icon: 20, 
      iconMobile: 18,
      text: 'text-sm sm:text-base',
      padding: 'p-3 sm:p-4',
      particleSize: 6
    },
    lg: { 
      icon: 28, 
      iconMobile: 24,
      text: 'text-base sm:text-lg',
      padding: 'p-4 sm:p-5',
      particleSize: 8
    }
  }

  const config = sizeConfig[size] || sizeConfig.md

  // Create particle effect from all selected stars
  const createParticles = (selectedRating) => {
    const newParticles = []
    const container = containerRef.current
    if (!container) return

    // Get container's position relative to document
    const containerRect = container.getBoundingClientRect()

    // Create particles from all selected stars (1 to selectedRating)
    for (let starValue = 1; starValue <= selectedRating; starValue++) {
      const starElement = starRefs.current[starValue]
      if (!starElement) continue

      // Get star position relative to viewport
      const starRect = starElement.getBoundingClientRect()
      
      // Calculate position relative to container (not viewport)
      const centerX = starRect.left - containerRect.left + starRect.width / 2
      const centerY = starRect.top - containerRect.top + starRect.height / 2

      const particleCount = 6 // Small stars per star
      const baseDelay = (starValue - 1) * 0.08 // Smoother stagger delay for each star

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4
        const distance = 30 + Math.random() * 25 // Slightly longer distance for smoother effect

        newParticles.push({
          id: Date.now() + starValue * 1000 + i,
          x: centerX,
          y: centerY,
          endX: centerX + Math.cos(angle) * distance,
          endY: centerY + Math.sin(angle) * distance,
          angle,
          distance,
          delay: baseDelay + i * 0.03, // Smoother stagger within each star
          starValue
        })
      }
    }

    setParticles(prev => [...prev, ...newParticles])

    // Remove particles after animation (smooth 2.5 seconds)
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
    }, 2500)
  }

  /**
   * Handle star click
   * Animates stars one by one sequentially, then creates particles from all selected stars
   * Checks authentication and redirects to login if needed
   */
  const handleStarClick = (starValue, event) => {
    if (disabled || loading) return

    // Check authentication - only users can rate
    if (!isAuthenticated || userType !== 'user') {
      // Redirect to login page with return URL
      const currentPath = window.location.pathname + window.location.search
      navigate('/user/phone-entry', { 
        state: { 
          returnTo: currentPath,
          message: 'Please login to rate this product'
        } 
      })
      return
    }

    // Check if productId is provided
    if (!productId) {
      // Product ID not provided. Rating will not be saved.
      // Still allow local rating change for UI purposes
      animateStars(starValue)
      return
    }

    // Reset rating first
    setRating(0)
    setLoading(true)
    
    // Animate stars one by one sequentially
    animateStars(starValue, async () => {
      try {
        // Save rating to backend
        const savedRating = await createOrUpdateRating(productId, starValue)
        
        // Update local state
        setRating(starValue)
        
        // Call callback if provided
        if (onRatingChange) {
          onRatingChange(starValue, savedRating)
        }
      } catch (error) {
        console.error('Error saving rating:', error)
        // Revert rating on error
        setRating(0)
        alert('Failed to save rating. Please try again.')
      } finally {
        setLoading(false)
      }
    })
  }

  /**
   * Animate stars sequentially
   */
  const animateStars = (starValue, onComplete = null) => {
    for (let i = 1; i <= starValue; i++) {
      setTimeout(() => {
        setRating(i)
        
        // After all stars are filled, create particles from all selected stars
        if (i === starValue) {
          // Perfect timing: release particles right after last star fills
          setTimeout(() => {
            createParticles(starValue)
            if (onComplete) {
              onComplete()
            }
          }, 100) // Reduced delay for smoother transition
        }
      }, (i - 1) * 150) // 150ms delay between each star
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
   * Gold Star SVG Component
   * Creates a beautiful gold glowing star with sequential fill animation
   */
  const GoldStar = ({ starValue, isActive, isHovered, size }) => {
    const starSize = size || config.icon
    const activeStar = hoveredStar || rating
    const isFilled = starValue <= activeStar
    const glowIntensity = isFilled ? (isHovered ? 1.2 : 1) : 0.3

    return (
      <svg
        width={starSize}
        height={starSize}
        viewBox="0 0 24 24"
        className="transition-all duration-300 ease-out"
        style={{
          filter: isFilled ? `drop-shadow(0 0 ${4 * glowIntensity}px rgba(255, 193, 7, 0.8)) drop-shadow(0 0 ${8 * glowIntensity}px rgba(255, 193, 7, 0.6))` : 'drop-shadow(0 0 1px rgba(255, 193, 7, 0.3))',
          transform: isFilled ? 'scale(1)' : 'scale(0.9)',
          opacity: isFilled ? 1 : 0.8
        }}
      >
        {/* Gold gradient */}
        <defs>
          <linearGradient id={`starGradient-${starValue}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC107" stopOpacity={isFilled ? 1 : 0.3} />
            <stop offset="50%" stopColor="#FFD54F" stopOpacity={isFilled ? 1 : 0.3} />
            <stop offset="100%" stopColor="#FFC107" stopOpacity={isFilled ? 0.9 : 0.2} />
          </linearGradient>
          <filter id={`glow-${starValue}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Star shape */}
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={isFilled ? `url(#starGradient-${starValue})` : 'rgba(255, 193, 7, 0.1)'}
          stroke={isFilled ? '#FFD54F' : '#FFC107'}
          strokeWidth={isFilled ? '1.5' : '1.5'}
          strokeOpacity={isFilled ? 0.9 : 0.7}
          className="transition-all duration-300 ease-out"
          style={{
            filter: isFilled ? `url(#glow-${starValue})` : 'none',
            opacity: isFilled ? 1 : 0.8
          }}
        />
        
        {/* Inner highlight for filled stars */}
        {isFilled && (
          <path
            d="M12 6L13.5 9.5L17.5 10L14.5 12.5L15.5 16.5L12 14.5L8.5 16.5L9.5 12.5L6.5 10L10.5 9.5L12 6Z"
            fill="rgba(255, 255, 255, 0.3)"
            className="transition-all duration-300 ease-out"
            style={{
              opacity: isFilled ? 1 : 0
            }}
          />
        )}
      </svg>
    )
  }

  /**
   * Small Particle Star Component
   * Tiny gold stars that appear from center of selected stars and fade out slowly
   * Positioned absolutely relative to container to stay fixed during scroll
   */
  const ParticleStar = ({ particle }) => {
    const endX = particle.endX
    const endY = particle.endY
    const deltaX = endX - particle.x
    const deltaY = endY - particle.y

    return (
      <div
        key={particle.id}
        className="absolute pointer-events-none"
        style={{
          left: `${particle.x}px`,
          top: `${particle.y}px`,
          zIndex: 1, // Behind the stars
          animation: `particleFloat${particle.id} 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          animationDelay: `${particle.delay}s`
        }}
      >
        <style>{`
          @keyframes particleFloat${particle.id} {
            0% {
              opacity: 0;
              transform: translate(0, 0) scale(0.5) rotate(0deg);
            }
            10% {
              opacity: 1;
              transform: translate(0, 0) scale(1) rotate(0deg);
            }
            50% {
              opacity: 0.9;
              transform: translate(${deltaX * 0.5}px, ${deltaY * 0.5}px) scale(0.85) rotate(180deg);
            }
            90% {
              opacity: 0.3;
              transform: translate(${deltaX * 0.9}px, ${deltaY * 0.9}px) scale(0.4) rotate(320deg);
            }
            100% {
              opacity: 0;
              transform: translate(${deltaX}px, ${deltaY}px) scale(0.15) rotate(360deg);
            }
          }
        `}</style>
        <svg
          width={config.particleSize}
          height={config.particleSize}
          viewBox="0 0 24 24"
          style={{
            filter: 'drop-shadow(0 0 2px rgba(255, 193, 7, 0.8))'
          }}
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="#FFD54F"
            stroke="#FFC107"
            strokeWidth="0.5"
            opacity="0.9"
          />
        </svg>
      </div>
    )
  }

  return (
    <>
      <div className={`w-full ${className}`}>
        <div 
          ref={containerRef}
          className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-3 sm:p-4 md:p-5 relative"
        >
          {/* Particle effects - positioned relative to container */}
          {particles.map((particle) => (
            <ParticleStar key={particle.id} particle={particle} />
          ))}
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
                    const isHovered = hoveredStar >= starValue && hoveredStar > 0
                    
                    return (
                      <button
                        key={starValue}
                        ref={(el) => (starRefs.current[starValue] = el)}
                        type="button"
                        disabled={disabled || loading}
                        onClick={(e) => handleStarClick(starValue, e)}
                        onMouseEnter={() => handleStarHover(starValue)}
                        className={`
                          ${disabled || loading ? 'cursor-default' : 'cursor-pointer'}
                          transition-all duration-300 ease-out
                          ${!disabled && !loading && 'hover:scale-125 active:scale-110'}
                          focus:outline-none
                          disabled:opacity-60
                          p-0.5 sm:p-1
                          flex-shrink-0
                          relative z-10
                        `}
                        aria-label={`Rate ${starValue} out of ${totalStars} stars`}
                        title={!disabled && !loading ? starTooltips[starValue] || '' : ''}
                      >
                        <GoldStar
                          starValue={starValue}
                          isActive={isActive}
                          isHovered={isHovered}
                          size={config.icon}
                        />
                      </button>
                    )
                  })}
                </div>
                
                {/* Rating Text - Next to stars */}
                {showRatingText && (
                  <>
                    {rating > 0 ? (
                      <RatingBadge
                        value={rating}
                        size="sm"
                        label="You"
                        className="ml-1 sm:ml-2"
                      />
                    ) : (
                      <span className={`${config.text} font-medium text-gray-500 ml-1 sm:ml-2`}>
                        Tap a star to rate
                      </span>
                    )}
                  </>
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
    </>
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
  productId: PropTypes.string,
  showStats: PropTypes.bool
}

export default StarRating
