import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

function ProductCard({ id, name, price, image, product }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => id && navigate(`/product/public/${id}`, { state: { product } })}
      className="min-w-[200px] bg-white rounded-2xl p-4 shadow hover:shadow-lg transition cursor-pointer"
    >
      <div className="aspect-[4/3] w-full mb-4 overflow-hidden rounded-lg bg-gray-100">
        {image && <img src={image} alt={name} className="w-full h-full object-cover" />}
      </div>
      <p className="font-semibold text-sm line-clamp-2">{name}</p>
      {price && <p className="text-amber-600 font-bold text-lg">{price}</p>}
    </div>
  )
}

ProductCard.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  price: PropTypes.string,
  image: PropTypes.string,
  product: PropTypes.object
}

export default ProductCard


