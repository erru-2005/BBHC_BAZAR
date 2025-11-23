/**
 * StarRating Component - Usage Examples
 * 
 * This file demonstrates various ways to use the StarRating component
 * in different scenarios within an e-commerce application.
 */

import StarRating from './StarRating'
import { useState } from 'react'

// ============================================
// Example 1: Basic Usage (Product Detail Page)
// ============================================
function ProductDetailExample() {
  const [rating, setRating] = useState(0)

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Rate this product</h3>
      <StarRating
        totalStars={5}
        initialRating={rating}
        onRatingChange={setRating}
        showRatingText={true}
        disabled={false}
        size="md"
      />
    </div>
  )
}

// ============================================
// Example 2: Product Card (Read-only Display)
// ============================================
function ProductCardExample({ productRating = 4.5 }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-2">Product Name</h3>
      <p className="text-gray-600 mb-2">₹999</p>
      
      {/* Display existing rating - disabled mode */}
      <StarRating
        totalStars={5}
        initialRating={productRating}
        showRatingText={true}
        disabled={true}
        size="sm"
      />
    </div>
  )
}

// ============================================
// Example 3: Review Form (Interactive)
// ============================================
function ReviewFormExample() {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating')
      return
    }
    // Submit review with rating
    console.log('Submitting review:', { rating, review })
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating
        </label>
        <StarRating
          totalStars={5}
          initialRating={rating}
          onRatingChange={setRating}
          showRatingText={true}
          disabled={false}
          size="lg"
        />
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write your review..."
        className="w-full p-2 border rounded"
        rows={4}
      />

      <button
        onClick={handleSubmit}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit Review
      </button>
    </div>
  )
}

// ============================================
// Example 4: Product List Item (Compact)
// ============================================
function ProductListItemExample({ product }) {
  return (
    <div className="flex items-center gap-4 p-3 border-b">
      <div className="flex-1">
        <h4 className="font-semibold">{product.name}</h4>
        <p className="text-sm text-gray-600">{product.price}</p>
      </div>
      
      {/* Compact rating display */}
      <StarRating
        totalStars={5}
        initialRating={product.rating || 0}
        showRatingText={false}
        disabled={true}
        size="sm"
      />
    </div>
  )
}

// ============================================
// Example 5: Average Rating Display
// ============================================
function AverageRatingExample({ averageRating, totalReviews }) {
  return (
    <div className="flex items-center gap-3">
      <StarRating
        totalStars={5}
        initialRating={averageRating}
        showRatingText={true}
        disabled={true}
        size="md"
      />
      <span className="text-sm text-gray-600">
        ({totalReviews} reviews)
      </span>
    </div>
  )
}

// ============================================
// Export all examples
// ============================================
export {
  ProductDetailExample,
  ProductCardExample,
  ReviewFormExample,
  ProductListItemExample,
  AverageRatingExample
}

