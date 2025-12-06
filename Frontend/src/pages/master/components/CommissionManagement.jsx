/**
 * Commission Management Component
 */
import { useState, useEffect } from 'react'
import { 
  getCategories, 
  getProducts, 
  applyCommissionToAll, 
  applyCommissionByCategory, 
  applyCommissionToProduct 
} from '../../../services/api'
import { FaPercent, FaCheck, FaTimes } from 'react-icons/fa'

function CommissionManagement() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: null, text: '' })
  
  // Commission settings
  const [generalCommission, setGeneralCommission] = useState('')
  const [categoryCommissions, setCategoryCommissions] = useState({})
  const [productCommissions, setProductCommissions] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesData, productsData] = await Promise.all([
        getCategories(),
        getProducts()
      ])
      // Handle different response structures
      const categoriesList = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData?.categories || [])
      const productsList = Array.isArray(productsData)
        ? productsData
        : (productsData?.products || [])
      
      setCategories(categoriesList)
      setProducts(productsList)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyAll = async () => {
    if (!generalCommission || parseFloat(generalCommission) < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid commission percentage (0 or greater)' })
      return
    }

    try {
      setLoading(true)
      setMessage({ type: null, text: '' })
      const response = await applyCommissionToAll(parseFloat(generalCommission))
      setMessage({ type: 'success', text: response.message || `Commission applied to ${response.updated_count} products` })
      setGeneralCommission('')
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply commission' })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCategory = async (category) => {
    const commissionRate = categoryCommissions[category]
    if (!commissionRate || parseFloat(commissionRate) < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid commission percentage' })
      return
    }

    try {
      setLoading(true)
      setMessage({ type: null, text: '' })
      const response = await applyCommissionByCategory(category, parseFloat(commissionRate))
      setMessage({ type: 'success', text: response.message || 'Commission applied successfully' })
      setCategoryCommissions(prev => {
        const updated = { ...prev }
        delete updated[category]
        return updated
      })
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply commission' })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyProduct = async (productId) => {
    const commissionRate = productCommissions[productId]
    if (!commissionRate || parseFloat(commissionRate) < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid commission percentage' })
      return
    }

    try {
      setLoading(true)
      setMessage({ type: null, text: '' })
      const response = await applyCommissionToProduct(productId, parseFloat(commissionRate))
      setMessage({ type: 'success', text: response.message || 'Commission applied successfully' })
      setProductCommissions(prev => {
        const updated = { ...prev }
        delete updated[productId]
        return updated
      })
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply commission' })
    } finally {
      setLoading(false)
    }
  }

  const addCategoryCommission = () => {
    if (!selectedCategory) {
      setMessage({ type: 'error', text: 'Please select a category' })
      return
    }
    setCategoryCommissions(prev => ({ ...prev, [selectedCategory]: '' }))
    setSelectedCategory('')
  }

  const addProductCommission = () => {
    if (!selectedProduct) {
      setMessage({ type: 'error', text: 'Please select a product' })
      return
    }
    setProductCommissions(prev => ({ ...prev, [selectedProduct]: '' }))
    setSelectedProduct('')
  }

  const removeCategoryCommission = (category) => {
    setCategoryCommissions(prev => {
      const updated = { ...prev }
      delete updated[category]
      return updated
    })
  }

  const removeProductCommission = (productId) => {
    setProductCommissions(prev => {
      const updated = { ...prev }
      delete updated[productId]
      return updated
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Commission Management</h2>
        <p className="text-gray-600">Set commission rates for products based on category or individual products</p>
      </div>

      {/* Priority Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Priority System</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Commission Type</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-green-50">
                <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">1 (Highest)</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Product-Specific</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Commission set for individual products. Overrides all other commission types.</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">2</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Category-Based</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Commission set for all products in a category. Applied if no product-specific commission exists.</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">3 (Lowest)</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">General (All Products)</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Commission applied to all products. Only used if no product-specific or category commission exists.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          <strong>Note:</strong> Commission is calculated as a percentage of the selling price (not max price).
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* General Commission for All Products */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaPercent className="w-5 h-5" />
          Apply Commission to All Products
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={generalCommission}
              onChange={(e) => setGeneralCommission(e.target.value)}
              placeholder="e.g., 5.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>
          <button
            onClick={handleApplyAll}
            disabled={loading || !generalCommission}
            className="px-6 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Apply to All
          </button>
        </div>
      </div>

      {/* Category-based Commission */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Commission by Category</h3>
        
        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
            >
              <option value="">Choose a category...</option>
              {categories && categories.length > 0 ? (
                categories.map((cat) => {
                  const categoryName = cat.name || cat
                  const categoryId = cat.id || cat._id || categoryName
                  return (
                    <option key={categoryId} value={categoryName}>
                      {categoryName}
                    </option>
                  )
                })
              ) : (
                <option value="" disabled>No categories available</option>
              )}
            </select>
          </div>
          <button
            onClick={addCategoryCommission}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(categoryCommissions).map(([category, commission]) => (
            <div key={category} className="flex gap-4 items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-gray-900">{category}</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={commission}
                  onChange={(e) => setCategoryCommissions(prev => ({
                    ...prev,
                    [category]: e.target.value
                  }))}
                  placeholder="%"
                  className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                />
                <button
                  onClick={() => handleApplyCategory(category)}
                  disabled={loading || !commission}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                  title="Apply"
                >
                  <FaCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeCategoryCommission(category)}
                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  title="Remove"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product-specific Commission */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Commission for Specific Products</h3>
        
        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
            >
              <option value="">Choose a product...</option>
              {products && products.length > 0 ? (
                products.map((prod) => {
                  const productId = prod.id || prod._id
                  const productName = prod.product_name || prod.name || 'Unknown Product'
                  const sellingPrice = Number(prod.selling_price || prod.price || 0)
                  return (
                    <option key={productId} value={productId}>
                      {productName} - ₹{sellingPrice.toLocaleString('en-IN')}
                    </option>
                  )
                })
              ) : (
                <option value="" disabled>No products available</option>
              )}
            </select>
          </div>
          <button
            onClick={addProductCommission}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(productCommissions).map(([productId, commission]) => {
            const product = products.find(p => (p.id || p._id) === productId)
            return (
              <div key={productId} className="flex gap-4 items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    {product?.product_name || 'Unknown Product'}
                  </span>
                  {product && (
                    <span className="text-sm text-gray-600 ml-2">
                      (₹{Number(product.selling_price || 0).toLocaleString('en-IN')})
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={commission}
                    onChange={(e) => setProductCommissions(prev => ({
                      ...prev,
                      [productId]: e.target.value
                    }))}
                    placeholder="%"
                    className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    onClick={() => handleApplyProduct(productId)}
                    disabled={loading || !commission}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                    title="Apply"
                  >
                    <FaCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeProductCommission(productId)}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    title="Remove"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CommissionManagement

