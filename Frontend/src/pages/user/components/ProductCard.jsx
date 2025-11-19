import PropTypes from 'prop-types'

function ProductCard({ name, price, image }) {
  return (
    <div className="min-w-[200px] bg-white rounded-2xl p-4 shadow hover:shadow-lg transition">
      <div className="aspect-[4/3] w-full mb-4 overflow-hidden rounded-lg bg-gray-100">
        {image && <img src={image} alt={name} className="w-full h-full object-cover" />}
      </div>
      <p className="font-semibold text-sm">{name}</p>
      {price && <p className="text-amber-600 font-bold text-lg">{price}</p>}
    </div>
  )
}

ProductCard.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.string,
  image: PropTypes.string
}

export default ProductCard


