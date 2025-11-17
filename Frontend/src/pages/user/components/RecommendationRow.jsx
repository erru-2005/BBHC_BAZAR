import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlist } from '../../../store/dataSlice'

function RecommendationRow({ title, products }) {
  const wishlist = useSelector((state) => state.data.home.wishlist || [])
  const dispatch = useDispatch()

  if (!products?.length) return null
  const visibleProducts = products.slice(0, 3)

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button className="text-sm font-semibold text-amber-600">See more</button>
      </div>
      <div className="space-y-4">
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl shadow p-4 flex gap-4 items-start"
          >
            <Link
              to={`/product/${product.id}`}
              className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0"
            >
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
            </Link>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{product.brand}</p>
                <Link to={`/product/${product.id}`} className="text-base font-semibold text-slate-900">
                  {product.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">{product.rating}★</span>
                  <span>{product.reviews} ratings</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">{product.price}</span>
                {product.mrp && <span className="text-sm line-through text-slate-400">{product.mrp}</span>}
                {product.discount && (
                  <span className="text-xs font-semibold text-emerald-600">{product.discount}</span>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/product/${product.id}`}
                  className="flex-1 text-center px-4 py-2 rounded-full bg-[#131921] text-white text-sm font-semibold"
                >
                  Buy now
                </Link>
                <button
                  onClick={() => dispatch(toggleWishlist(product.id))}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                    wishlist.includes(product.id)
                      ? 'border-pink-500 text-pink-500'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {wishlist.includes(product.id) ? 'Wishlisted' : 'Wishlist'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

RecommendationRow.propTypes = {
  title: PropTypes.string.isRequired,
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.string,
      image: PropTypes.string,
    })
  ).isRequired,
}

export default RecommendationRow


