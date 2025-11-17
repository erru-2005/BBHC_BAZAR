import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

function ProductCard({ id, name, price, image, wished, onToggleWishlist }) {
  return (
    <div className="min-w-[200px] bg-white rounded-2xl p-4 shadow hover:shadow-lg transition relative">
      {onToggleWishlist && (
        <button
          type="button"
          onClick={onToggleWishlist}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow bg-white ${
            wished ? 'text-pink-500' : 'text-slate-500'
          }`}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={wished ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12.1 20.45 12 20.5l-.1-.05C7.14 17.88 4 14.997 4 11.5 4 9.5 5.5 8 7.5 8c1.54 0 2.54.99 3 1.54C11.96 8.99 12.96 8 14.5 8 16.5 8 18 9.5 18 11.5c0 3.497-3.14 6.38-5.9 8.95Z"
            />
          </svg>
        </button>
      )}
      <Link to={`/product/${id}`} className="block">
        <div className="aspect-[4/3] w-full mb-4 overflow-hidden rounded-lg bg-gray-100">
          {image && <img src={image} alt={name} className="w-full h-full object-cover" />}
        </div>
        <p className="font-semibold text-sm text-slate-900">{name}</p>
        {price && <p className="text-amber-600 font-bold text-lg">{price}</p>}
      </Link>
    </div>
  )
}

ProductCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  price: PropTypes.string,
  image: PropTypes.string,
  wished: PropTypes.bool,
  onToggleWishlist: PropTypes.func,
}

export default ProductCard


