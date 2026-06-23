/**
 * Service Credit Management — per service category accept credits
 */
import { useState, useEffect } from 'react'
import { FaCoins, FaSave } from 'react-icons/fa'
import {
  getCategories,
  getServiceCategoryAcceptCredits,
  saveServiceCategoryAcceptCredits,
} from '../../../services/api'

const DEFAULT_CREDIT = 25

function ServiceCreditManagement() {
  const [categories, setCategories] = useState([])
  const [creditsByCategory, setCreditsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: null, text: '' })

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage({ type: null, text: '' })
      const [serviceCategories, creditData] = await Promise.all([
        getCategories('service'),
        getServiceCategoryAcceptCredits(),
      ])
      const list = Array.isArray(serviceCategories) ? serviceCategories : []
      const saved = creditData.categoryCredits || {}
      const fallback = creditData.defaultCredit ?? DEFAULT_CREDIT

      const initial = {}
      list.forEach((cat) => {
        const name = cat.name || cat
        initial[name] = saved[name] ?? fallback
      })

      setCategories(list)
      setCreditsByCategory(initial)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load service categories' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreditChange = (categoryName, value) => {
    setCreditsByCategory((prev) => ({ ...prev, [categoryName]: value }))
  }

  const handleSave = async () => {
    const payload = {}
    for (const [category, raw] of Object.entries(creditsByCategory)) {
      const count = parseInt(raw, 10)
      if (Number.isNaN(count) || count < 0) {
        setMessage({
          type: 'error',
          text: `Enter a valid credit count (0 or greater) for "${category}"`,
        })
        return
      }
      payload[category] = count
    }

    if (Object.keys(payload).length === 0) {
      setMessage({ type: 'error', text: 'No service categories to save. Add categories first.' })
      return
    }

    try {
      setSaving(true)
      setMessage({ type: null, text: '' })
      const response = await saveServiceCategoryAcceptCredits(payload)
      setMessage({
        type: 'success',
        text: response.message || 'Service category credits saved successfully',
      })
      await loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save credits' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaCoins className="w-8 h-8 text-amber-500" />
          Service Credit Management
        </h2>
        <p className="text-gray-600">
          Set how many credits are deducted when a seller accepts a service booking, per service
          category. Unconfigured categories use the platform default ({DEFAULT_CREDIT} credits).
        </p>
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

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading service categories...</p>
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            No service categories found. Add categories from the Add Service tab first.
          </p>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-gray-700">
                <span>Service Category</span>
                <span>Credits on Accept</span>
              </div>
            </div>
            <ul className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const name = cat.name || cat
                return (
                  <li
                    key={cat.id || cat._id || name}
                    className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center hover:bg-gray-50/50"
                  >
                    <span className="font-medium text-gray-900">{name}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={creditsByCategory[name] ?? DEFAULT_CREDIT}
                      onChange={(e) => handleCreditChange(name, e.target.value)}
                      className="master-credit-input w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      aria-label={`Credits for ${name}`}
                    />
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
          >
            <FaSave className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ServiceCreditManagement
