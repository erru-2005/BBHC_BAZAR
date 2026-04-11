import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../../../utils/image'

function ProductCard({ id, name, price, image, product }) {
  const navigate = useNavigate()
  
  // Use product properties if available, fallback to price prop
  const displayPrice = Number(product?.total_selling_price || product?.selling_price || product?.price || price || 0)
  const maxPrice = Number(product?.max_price || product?.selling_price || displayPrice)
  const discountPercentage =
    displayPrice && maxPrice && maxPrice > displayPrice
      ? Math.round(((maxPrice - displayPrice) / maxPrice) * 100)
      : null

  return (
    <div
      onClick={() => id && navigate(`/product/public/${id}`, { state: { product } })}
      className="min-w-[160px] max-w-[200px] bg-white rounded-2xl border border-gray-100 p-2.5 flex flex-col hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="aspect-[4/3] w-full mb-2 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
        {image && <img src={getImageUrl(image)} alt={name} className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1">
        <h3 className="text-[13px] font-medium text-gray-800 line-clamp-1 mb-1">{name}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-gray-900">₹{displayPrice.toLocaleString('en-IN')}</p>
          {discountPercentage && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">
              {discountPercentage}% OFF
            </span>
          )}
        </div>
        {maxPrice > displayPrice && (
          <p className="text-[11px] text-gray-400 line-through mt-0.5">₹{maxPrice.toLocaleString('en-IN')}</p>
        )}
      </div>
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


