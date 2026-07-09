/**
 * Delivery Management — Products & Services
 */
import { useState, useEffect } from 'react'
import {
  getCategories,
  getProducts,
  getServices,
  getDeliveryRates,
  applyDeliveryToAll,
  applyDeliveryByCategory,
  applyDeliveryToItem,
} from '../../../services/api'
import { syncCatalogMutation } from '../../../services/cacheSync'
import { FaTruck, FaCheck, FaTimes, FaCoins } from 'react-icons/fa'

function PriorityTable({ entityLabel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Priority System</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Priority</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Delivery Rule Type</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-green-50">
              <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">1 (Highest)</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{entityLabel}-Specific</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Delivery fee set for individual {entityLabel.toLowerCase()}s. Overrides all other delivery fee configurations.
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">2</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Category-Based</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Delivery fee for all {entityLabel.toLowerCase()}s in a category. Used if no {entityLabel.toLowerCase()}-specific fee exists.
              </td>
            </tr>
            <tr className="bg-yellow-50">
              <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">3 (Lowest)</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">General (All {entityLabel}s)</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Applied to all {entityLabel.toLowerCase()}s when no category-based or specific delivery fee exists.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        <strong>Note:</strong> Set the fee to 0 to make delivery <strong>FREE</strong> for customers.
      </p>
    </div>
  )
}

function DeliveryRatesPanel({
  entityLabel,
  priceLabel,
  items,
  categories,
  rates,
  loading,
  onApplyAll,
  onApplyCategory,
  onApplyItem,
  getItemId,
  getItemName,
  getItemPrice,
  type,
}) {
  const [generalRate, setGeneralRate] = useState('')
  const [categoryRates, setCategoryRates] = useState({})
  const [itemRates, setItemRates] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState('')

  // Initialize general rate from API response
  useEffect(() => {
    if (rates) {
      if (type === 'product' && rates.global_product_rate !== undefined) {
        setGeneralRate(String(rates.global_product_rate))
      } else if (type === 'service' && rates.global_service_rate !== undefined) {
        setGeneralRate(String(rates.global_service_rate))
      }
      
      // Load category rates
      const catRates = type === 'product' ? rates.category_product_rates : rates.category_service_rates
      if (catRates) {
        setCategoryRates(catRates)
      }

      // Load item rates
      const specificRates = type === 'product' ? rates.product_rates : rates.service_rates
      if (specificRates) {
        setItemRates(specificRates)
      }
    }
  }, [rates, type])

  const addCategoryRate = () => {
    if (!selectedCategory) return
    setCategoryRates((prev) => ({ ...prev, [selectedCategory]: categoryRates[selectedCategory] ?? '' }))
    setSelectedCategory('')
  }

  const addItemRate = () => {
    if (!selectedItem) return
    setItemCommissions((prev) => ({ ...prev, [selectedItem]: itemRates[selectedItem] ?? '' }))
    setSelectedItem('')
  }

  const setItemCommissions = (fn) => {
    setItemRates(fn)
  }

  return (
    <div className="space-y-6">
      <PriorityTable entityLabel={entityLabel} />

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaTruck className="w-5 h-5 text-gray-700" />
          Apply Global Delivery Charge to All {entityLabel}s
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={generalRate}
              onChange={(e) => setGeneralRate(e.target.value)}
              placeholder="e.g., 15 (Enter 0 for Free)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>
          <button
            type="button"
            onClick={() => onApplyAll(generalRate)}
            disabled={loading || generalRate === ''}
            className="px-6 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Apply to All
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Delivery Fee by Category</h3>
        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
            >
              <option value="">Choose a category...</option>
              {categories.map((cat) => {
                const categoryName = cat.name || cat
                const categoryId = cat.id || cat._id || categoryName
                return (
                  <option key={categoryId} value={categoryName}>
                    {categoryName}
                  </option>
                )
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={addCategoryRate}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
        <div className="space-y-3">
          {Object.entries(categoryRates).map(([category, rate]) => (
            <div key={category} className="flex gap-4 items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-gray-900">{category}</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rate}
                  onChange={(e) =>
                    setCategoryRates((prev) => ({ ...prev, [category]: e.target.value }))
                  }
                  placeholder="₹"
                  className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => onApplyCategory(category, rate)}
                  disabled={loading || rate === ''}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                  title="Apply"
                >
                  <FaCheck className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCategoryRates((prev) => {
                      const next = { ...prev }
                      delete next[category]
                      return next
                    })
                  }
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

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Delivery Fee for Specific {entityLabel}s</h3>
        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select {entityLabel}</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
            >
              <option value="">Choose a {entityLabel.toLowerCase()}...</option>
              {items.map((item) => {
                const id = getItemId(item)
                const name = getItemName(item)
                const price = getItemPrice(item)
                return (
                  <option key={id} value={id}>
                    {name} — ₹{Number(price || 0).toLocaleString('en-IN')} ({priceLabel})
                  </option>
                )
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={addItemRate}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
        <div className="space-y-3">
          {Object.entries(itemRates).map(([itemId, rate]) => {
            const item = items.find((i) => getItemId(i) === itemId)
            return (
              <div key={itemId} className="flex gap-4 items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{item ? getItemName(item) : 'Unknown'}</span>
                  {item && (
                    <span className="text-sm text-gray-600 ml-2">
                      (₹{Number(getItemPrice(item) || 0).toLocaleString('en-IN')})
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={rate}
                    onChange={(e) =>
                      setItemRates((prev) => ({ ...prev, [itemId]: e.target.value }))
                    }
                    placeholder="₹"
                    className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => onApplyItem(itemId, rate)}
                    disabled={loading || rate === ''}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                    title="Apply"
                  >
                    <FaCheck className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItemRates((prev) => {
                        const next = { ...prev }
                        delete next[itemId]
                        return next
                      })
                    }
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

function DeliveryManagement() {
  const [activeTab, setActiveTab] = useState('products')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: null, text: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesData, productsData, servicesData, ratesData] = await Promise.all([
        getCategories(),
        getProducts({}, { forceRefresh: true }),
        getServices({}, { forceRefresh: true }),
        getDeliveryRates(),
      ])

      const categoriesList = Array.isArray(categoriesData)
        ? categoriesData
        : categoriesData?.categories || []
      const productsList = Array.isArray(productsData) ? productsData : productsData?.products || []
      const servicesList = Array.isArray(servicesData) ? servicesData : servicesData?.services || []

      setCategories(categoriesList)
      setProducts(productsList)
      setServices(servicesList)
      setRates(ratesData)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load delivery configuration data' })
    } finally {
      setLoading(false)
    }
  }

  const wrapApply = async (fn, successFallback) => {
    try {
      setLoading(true)
      setMessage({ type: null, text: '' })
      const response = await fn()
      setMessage({ type: 'success', text: response.message || successFallback })
      syncCatalogMutation(['products', 'services'])
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply delivery configuration changes' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Delivery Management</h2>
        <p className="text-gray-600">
          Configure global, category, or specific item delivery charges. Set fee to 0 to enable free delivery.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'products', label: 'Products' },
          { id: 'services', label: 'Services' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {activeTab === 'products' && (
        <DeliveryRatesPanel
          entityLabel="Product"
          priceLabel="selling price"
          items={products}
          categories={categories}
          rates={rates}
          loading={loading}
          type="product"
          onApplyAll={(rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryToAll(parseFloat(rate), 'product')
            }, 'Global delivery charge applied to products')
          }
          onApplyCategory={(category, rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryByCategory(category, parseFloat(rate), 'product')
            }, 'Category delivery charge applied')
          }
          onApplyItem={(itemId, rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryToItem(itemId, parseFloat(rate), 'product')
            }, 'Product-specific delivery charge applied')
          }
          getItemId={(p) => p.id || p._id}
          getItemName={(p) => p.product_name || p.name || 'Unknown Product'}
          getItemPrice={(p) => p.selling_price || p.price || 0}
        />
      )}

      {activeTab === 'services' && (
        <DeliveryRatesPanel
          entityLabel="Service"
          priceLabel="service charge"
          items={services}
          categories={categories}
          rates={rates}
          loading={loading}
          type="service"
          onApplyAll={(rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryToAll(parseFloat(rate), 'service')
            }, 'Global delivery charge applied to services')
          }
          onApplyCategory={(category, rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryByCategory(category, parseFloat(rate), 'service')
            }, 'Category delivery charge applied')
          }
          onApplyItem={(itemId, rate) =>
            wrapApply(async () => {
              if (rate === '' || parseFloat(rate) < 0) throw new Error('Enter a valid delivery fee')
              return await applyDeliveryToItem(itemId, parseFloat(rate), 'service')
            }, 'Service-specific delivery charge applied')
          }
          getItemId={(s) => s.id || s._id}
          getItemName={(s) => s.service_name || s.name || 'Unknown Service'}
          getItemPrice={(s) => s.service_charge || 0}
        />
      )}
    </div>
  )
}

export default DeliveryManagement
