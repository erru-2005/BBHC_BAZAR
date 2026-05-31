/**
 * Commission Management — Products & Services
 */
import { useState, useEffect } from 'react'
import {
  getCategories,
  getProducts,
  getServices,
  applyCommissionToAll,
  applyCommissionByCategory,
  applyCommissionToProduct,
  applyServiceCommissionToAll,
  applyServiceCommissionByCategory,
  applyCommissionToService,
  getServiceAcceptCredit,
  setServiceAcceptCredit,
  invalidateServiceAcceptCreditCache,
} from '../../../services/api'
import { syncCatalogMutation } from '../../../services/cacheSync'
import { FaPercent, FaCheck, FaTimes, FaCoins } from 'react-icons/fa'

function PriorityTable({ entityLabel }) {
  return (
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
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{entityLabel}-Specific</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Commission set for individual {entityLabel.toLowerCase()}s. Overrides all other commission types.
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">2</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Category-Based</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Commission for all {entityLabel.toLowerCase()}s in a category. Used if no {entityLabel.toLowerCase()}-specific rate exists.
              </td>
            </tr>
            <tr className="bg-yellow-50">
              <td className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">3 (Lowest)</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">General (All {entityLabel}s)</td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                Applied to all {entityLabel.toLowerCase()}s when no specific or category commission exists.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        <strong>Note:</strong> Commission is calculated as a percentage of the base price (selling price / service charge).
      </p>
    </div>
  )
}

function CommissionRatesPanel({
  entityLabel,
  priceLabel,
  items,
  categories,
  loading,
  onApplyAll,
  onApplyCategory,
  onApplyItem,
  getItemId,
  getItemName,
  getItemPrice,
}) {
  const [generalCommission, setGeneralCommission] = useState('')
  const [categoryCommissions, setCategoryCommissions] = useState({})
  const [itemCommissions, setItemCommissions] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState('')

  const addCategoryCommission = () => {
    if (!selectedCategory) return
    setCategoryCommissions((prev) => ({ ...prev, [selectedCategory]: '' }))
    setSelectedCategory('')
  }

  const addItemCommission = () => {
    if (!selectedItem) return
    setItemCommissions((prev) => ({ ...prev, [selectedItem]: '' }))
    setSelectedItem('')
  }

  return (
    <div className="space-y-6">
      <PriorityTable entityLabel={entityLabel} />

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaPercent className="w-5 h-5" />
          Apply Commission to All {entityLabel}s
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
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
            type="button"
            onClick={() => onApplyAll(generalCommission, () => setGeneralCommission(''))}
            disabled={loading || !generalCommission}
            className="px-6 py-2 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Apply to All
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Commission by Category</h3>
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
                  onChange={(e) =>
                    setCategoryCommissions((prev) => ({ ...prev, [category]: e.target.value }))
                  }
                  placeholder="%"
                  className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => onApplyCategory(category, commission, () =>
                    setCategoryCommissions((prev) => {
                      const next = { ...prev }
                      delete next[category]
                      return next
                    })
                  )}
                  disabled={loading || !commission}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                  title="Apply"
                >
                  <FaCheck className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCategoryCommissions((prev) => {
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Commission for Specific {entityLabel}s</h3>
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
            onClick={addItemCommission}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
        <div className="space-y-3">
          {Object.entries(itemCommissions).map(([itemId, commission]) => {
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
                    step="0.1"
                    value={commission}
                    onChange={(e) =>
                      setItemCommissions((prev) => ({ ...prev, [itemId]: e.target.value }))
                    }
                    placeholder="%"
                    className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => onApplyItem(itemId, commission, () =>
                      setItemCommissions((prev) => {
                        const next = { ...prev }
                        delete next[itemId]
                        return next
                      })
                    )}
                    disabled={loading || !commission}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
                    title="Apply"
                  >
                    <FaCheck className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItemCommissions((prev) => {
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

function CommissionManagement() {
  const [activeTab, setActiveTab] = useState('products')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: null, text: '' })
  const [serviceCreditCount, setServiceCreditCount] = useState('25')
  const [savingCredit, setSavingCredit] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesData, productsData, servicesData, creditData] = await Promise.all([
        getCategories(),
        getProducts({}, { forceRefresh: true }),
        getServices({}, { forceRefresh: true }),
        getServiceAcceptCredit(true),
      ])
      const categoriesList = Array.isArray(categoriesData)
        ? categoriesData
        : categoriesData?.categories || []
      const productsList = Array.isArray(productsData) ? productsData : productsData?.products || []
      const servicesList = Array.isArray(servicesData) ? servicesData : servicesData?.services || []

      setCategories(categoriesList)
      setProducts(productsList)
      setServices(servicesList)
      setServiceCreditCount(String(creditData))
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data' })
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
      setMessage({ type: 'error', text: err.message || 'Failed to apply' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveServiceCredit = async () => {
    const count = parseInt(serviceCreditCount, 10)
    if (Number.isNaN(count) || count < 0) {
      setMessage({ type: 'error', text: 'Enter a valid credit count (0 or greater)' })
      return
    }
    try {
      setSavingCredit(true)
      setMessage({ type: null, text: '' })
      const response = await setServiceAcceptCredit(count)
      invalidateServiceAcceptCreditCache()
      setMessage({
        type: 'success',
        text: response.message || `Service accept credit set to ${count}`,
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save credit count' })
    } finally {
      setSavingCredit(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Commission Management</h2>
        <p className="text-gray-600">
          Set commission rates for products and services. Configure service accept credit cost for sellers.
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
        <CommissionRatesPanel
          entityLabel="Product"
          priceLabel="selling price"
          items={products}
          categories={categories}
          loading={loading}
          onApplyAll={(rate, clear) =>
            wrapApply(async () => {
              if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
              const res = await applyCommissionToAll(parseFloat(rate))
              clear()
              return res
            }, 'Commission applied to products')
          }
          onApplyCategory={(category, rate, clear) =>
            wrapApply(async () => {
              if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
              const res = await applyCommissionByCategory(category, parseFloat(rate))
              clear()
              return res
            }, 'Category commission applied')
          }
          onApplyItem={(itemId, rate, clear) =>
            wrapApply(async () => {
              if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
              const res = await applyCommissionToProduct(itemId, parseFloat(rate))
              clear()
              return res
            }, 'Product commission applied')
          }
          getItemId={(p) => p.id || p._id}
          getItemName={(p) => p.product_name || p.name || 'Unknown Product'}
          getItemPrice={(p) => p.selling_price || p.price || 0}
        />
      )}

      {activeTab === 'services' && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FaCoins className="w-5 h-5 text-amber-500" />
              Service Accept Credit Count
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Credits deducted from a seller when they accept a service booking. This replaces the previous fixed 25-credit rule.
            </p>
            <div className="flex gap-4 items-end max-w-md">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Credits per service accept</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={serviceCreditCount}
                  onChange={(e) => setServiceCreditCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveServiceCredit}
                disabled={savingCredit}
                className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {savingCredit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <CommissionRatesPanel
            entityLabel="Service"
            priceLabel="service charge"
            items={services}
            categories={categories}
            loading={loading}
            onApplyAll={(rate, clear) =>
              wrapApply(async () => {
                if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
                const res = await applyServiceCommissionToAll(parseFloat(rate))
                clear()
                return res
              }, 'Commission applied to services')
            }
            onApplyCategory={(category, rate, clear) =>
              wrapApply(async () => {
                if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
                const res = await applyServiceCommissionByCategory(category, parseFloat(rate))
                clear()
                return res
              }, 'Service category commission applied')
            }
            onApplyItem={(itemId, rate, clear) =>
              wrapApply(async () => {
                if (!rate || parseFloat(rate) < 0) throw new Error('Enter a valid commission percentage')
                const res = await applyCommissionToService(itemId, parseFloat(rate))
                clear()
                return res
              }, 'Service commission applied')
            }
            getItemId={(s) => s.id || s._id}
            getItemName={(s) => s.service_name || s.name || 'Unknown Service'}
            getItemPrice={(s) => s.service_charge || 0}
          />
        </>
      )}
    </div>
  )
}

export default CommissionManagement
