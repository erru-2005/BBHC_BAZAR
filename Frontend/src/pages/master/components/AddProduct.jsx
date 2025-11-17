/**
 * Add Product Component
 */
import { useState } from 'react'

function AddProduct() {
  const [form, setForm] = useState({
    productName: '',
    specification: '',
    points: ''
  })
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState({ type: null, message: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
    setStatus({ type: null, message: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.productName.trim() || !form.specification.trim() || !form.points.trim()) {
      setStatus({ type: 'error', message: 'Please fill in all fields before adding a product.' })
      return
    }

    const newProduct = {
      ...form,
      createdAt: new Date().toISOString()
    }

    setProducts((prev) => [newProduct, ...prev])
    setStatus({ type: 'success', message: 'Product saved locally. Connect API to persist data.' })
    setForm({
      productName: '',
      specification: '',
      points: ''
    })
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] gap-10">
      <div className="w-full max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Add Product</h2>

        {status.type && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              status.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {status.message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specification <span className="text-red-500">*</span>
            </label>
            <textarea
              name="specification"
              value={form.specification}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-none"
              placeholder="Describe the specification"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points Related To It <span className="text-red-500">*</span>
            </label>
            <textarea
              name="points"
              value={form.points}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-none"
              placeholder="Add bullet points or notes (separate with commas or new lines)"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Example: Highlight benefits, usage, or unique selling points.</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
          >
            Save Product
          </button>
        </form>
      </div>

      {products.length > 0 && (
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently Added (Local Preview)</h3>
          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={`${product.productName}-${product.createdAt}-${index}`}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-lg font-semibold text-gray-900">{product.productName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(product.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Specification</p>
                    <p className="text-gray-600 whitespace-pre-line">{product.specification}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Points</p>
                    <p className="text-gray-600 whitespace-pre-line">{product.points}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AddProduct


