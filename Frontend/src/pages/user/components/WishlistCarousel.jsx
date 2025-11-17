import PropTypes from 'prop-types'

function WishlistCarousel({ products }) {
  if (!products?.length) return null

  return (
    <section className="md:hidden pt-4 pb-2">
      <h3 className="text-sm font-semibold text-slate-900 mb-2 px-1">Your wishlist</h3>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-col items-center flex-shrink-0 w-20"
          >
            <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-500 px-1 text-center">No image</span>
              )}
            </div>
            <p className="mt-1 text-[0.65rem] text-center text-slate-700 line-clamp-2">
              {product.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

WishlistCarousel.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
    })
  ),
}

export default WishlistCarousel


