import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProductById } from '../../services/api'
import SellerProductForm from './components/ProductForm'

function SellerEditProduct() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProductById(productId)
        setProduct(data)
      } catch (err) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">
        Loading product…
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-semibold text-slate-700">{error || 'Product not found.'}</p>
        <button
          onClick={() => navigate('/seller/products')}
          className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF3FF] via-white to-[#F4ECFF] text-slate-900 py-10">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500">Make updates to keep your listing accurate and fresh.</p>
        </div>
        <SellerProductForm initialProduct={product} />
      </div>
    </div>
  )
}

export default SellerEditProduct

