import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { FaMagnifyingGlass, FaXmark, FaHeart } from 'react-icons/fa6'
import { addToWishlist, removeFromWishlist } from '../../../services/api'

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '₹0'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function SearchOverlay({ isOpen, onClose, initialQuery = '' }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const dispatch = useDispatch()
  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const wishlistIds = home?.wishlist || []

  const allProducts = home?.products || []

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery || '')
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }, [isOpen, initialQuery])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSuggestions([])
      setRecommendedProducts([])
    }
  }, [isOpen])

  // Generate search suggestions based on query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setRecommendedProducts([])
      return
    }

    const query = searchQuery.toLowerCase().trim()
    
    // Generate suggestions from product names
    const productNames = allProducts.map(p => p.product_name || '').filter(Boolean)
    const uniqueSuggestions = [...new Set(productNames)]
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 6) // Top 6 suggestions
    
    setSuggestions(uniqueSuggestions)

    // Filter recommended products
    const filtered = allProducts.filter(product => {
      const productName = (product.product_name || '').toLowerCase()
      const specification = (product.specification || '').toLowerCase()
      const categories = Array.isArray(product.categories) 
        ? product.categories.map(c => typeof c === 'string' ? c : c.name || c).join(' ').toLowerCase()
        : ''
      
      return (
        productName.includes(query) ||
        specification.includes(query) ||
        categories.includes(query)
      )
    }).slice(0, 6) // Top 6 products
    
    setRecommendedProducts(filtered)
  }, [searchQuery, allProducts])

  const handleSuggestionClick = (suggestion) => {
    const nextQuery = suggestion || ''
    setSearchQuery(nextQuery)
    // Navigate to search results page with suggestion
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`)
    onClose()
  }

  const handleProductClick = (product) => {
    const productId = product.id || product._id
    navigate(`/product/public/${productId}`, { state: { product } })
    onClose()
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results page or filter products
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#131921] text-white px-4 py-3 flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 bg-white rounded-full px-3 py-2">
          <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search BBHCBazaar"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          )}
        </form>
        <button
          onClick={onClose}
          className="text-white font-semibold px-3 py-1"
        >
          Cancel
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-[#131921] text-white px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 py-3">
            <FaMagnifyingGlass className="text-gray-400 w-5 h-5 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BBHCBazaar"
              className="flex-1 bg-transparent text-base text-gray-800 placeholder-gray-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaXmark className="w-5 h-5" />
              </button>
            )}
          </form>
          <button
            onClick={onClose}
            className="text-white font-semibold px-4 py-2 hover:text-amber-300 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Search Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {!searchQuery ? (
          <div className="text-center py-12">
            <FaMagnifyingGlass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Start typing to search for products</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Suggestions</h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
                    >
                      <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
                      <span className="text-gray-800">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recommended Products</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {recommendedProducts.map((product) => {
                    const productId = String(product.id || product._id)
                    const isWishlisted = wishlistIds.includes(productId)
                    const displayPrice = Number(product.total_selling_price || product.selling_price || product.max_price || 0)
                    const maxPrice = Number(product.max_price || product.selling_price || 0)
                    const discount = displayPrice && maxPrice && maxPrice > displayPrice
                      ? Math.round(((maxPrice - displayPrice) / maxPrice) * 100)
                      : null
                    const thumbnail = product.thumbnail || product.media?.thumbnail

                    return (
                      <div
                        key={productId}
                        onClick={() => handleProductClick(product)}
                        className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition"
                      >
                        <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2">
                          {thumbnail ? (
                            <img
                              src={thumbnail?.preview || thumbnail?.data_url || thumbnail?.url || thumbnail}
                              alt={product.product_name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                          {isAuthenticated && userType === 'user' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  if (isWishlisted) {
                                    await removeFromWishlist(productId)
                                    dispatch({ type: 'data/toggleWishlist', payload: productId })
                                  } else {
                                    await addToWishlist(productId)
                                    dispatch({ type: 'data/toggleWishlist', payload: productId })
                                  }
                                } catch (error) {
                                  console.error('Failed to update wishlist:', error)
                                }
                              }}
                              className={`absolute top-2 right-2 p-1.5 rounded-full ${
                                isWishlisted
                                  ? 'bg-red-50 border border-red-200 text-red-600'
                                  : 'bg-white border border-gray-200 text-gray-500'
                              }`}
                            >
                              <FaHeart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
                            </button>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
                          {product.product_name}
                        </h4>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(displayPrice)}</span>
                          {discount && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                        {displayPrice && maxPrice && discount && (
                          <p className="text-[10px] text-gray-500 line-through">{formatCurrency(maxPrice)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {searchQuery && suggestions.length === 0 && recommendedProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchOverlay






