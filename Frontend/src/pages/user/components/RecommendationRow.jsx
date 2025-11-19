import PropTypes from 'prop-types'
import ProductCard from './ProductCard'

function RecommendationRow({ title, products }) {
  if (!products?.length) return null
  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button className="text-sm font-semibold text-amber-600">See more</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => (
          <ProductCard key={product.id} name={product.name} price={product.price} image={product.image} />
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
      image: PropTypes.string
    })
  ).isRequired
}

export default RecommendationRow


