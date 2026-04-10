import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  createSellerProduct,
  updateSellerProduct,
  getCategories,
  getCategoryCommissionRates
} from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

const convertFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function SellerProductForm({ initialProduct = null }) {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [form, setForm] = useState({
    productName: '',
    specification: '',
    sellingPrice: '',
    maxPrice: '',
    quantity: '',
    category: ''
  })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [thumbnail, setThumbnail] = useState(null)
  const [gallery, setGallery] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryCommissionRates, setCategoryCommissionRates] = useState({})
  const [status, setStatus] = useState({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)

  const isEditing = useMemo(() => !!initialProduct, [initialProduct])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories()
        const categoriesList = Array.isArray(data) ? data : (data?.categories || [])
        setCategories(categoriesList)

        // Load category commission rates
        try {
          const rates = await getCategoryCommissionRates()
          setCategoryCommissionRates(rates || {})
        } catch (err) {
          console.warn('Failed to load category commission rates', err)
        }
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (initialProduct) {
      setForm({
        productName: initialProduct.product_name || '',
        specification: initialProduct.specification || '',
        sellingPrice: initialProduct.selling_price || '',
        maxPrice: initialProduct.max_price || '',
        quantity:
          initialProduct.quantity ||
          initialProduct.stock ||
          initialProduct.available_quantity ||
          '',
        category: Array.isArray(initialProduct.categories) ? initialProduct.categories[0] : initialProduct.categories || ''
      })
      setPoints(
        Array.isArray(initialProduct.points) && initialProduct.points.length
          ? initialProduct.points
          : INITIAL_POINTS
      )
      setThumbnail(
        initialProduct.thumbnail
          ? typeof initialProduct.thumbnail === 'string'
            ? { preview: initialProduct.thumbnail }
            : initialProduct.thumbnail
          : null
      )
      setGallery(
        Array.isArray(initialProduct.gallery)
          ? initialProduct.gallery.map((item) =>
            typeof item === 'string' ? { preview: item } : item
          )
          : []
      )
    }
  }, [initialProduct])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setStatus({ type: null, message: '' })
  }

  // Calculate total selling price with commission
  const calculateTotalPrice = () => {
    const sellingPrice = parseFloat(form.sellingPrice) || 0
    if (sellingPrice <= 0) return ''

    // Get commission rate from category if available
    const commissionRate = categoryCommissionRates[form.category] || 0
    if (commissionRate > 0) {
      const commissionAmount = (sellingPrice * commissionRate) / 100
      return (sellingPrice + commissionAmount).toFixed(2)
    }
    return sellingPrice.toFixed(2)
  }

  const handlePointChange = (index, value) => {
    setPoints((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const handleAddPointField = () => {
    setPoints((prev) => [...prev, ''])
  }

  const handleRemovePointField = (index) => {
    if (points.length <= 1) return
    setPoints((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setThumbnail(null)
      return
    }
    try {
      const dataUrl = await convertFileToDataUrl(file)
      setThumbnail({
        name: file.name,
        size: file.size,
        preview: dataUrl
      })
      setStatus({ type: null, message: '' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to read thumbnail image. Please try again.' })
    }
  }

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      setGallery([])
      return
    }
    try {
      const items = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          size: file.size,
          preview: await convertFileToDataUrl(file)
        }))
      )
      setGallery(items)
      setStatus({ type: null, message: '' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to read gallery images. Please try again.' })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    // Ensure status area is visible when submitting (for validation or server errors)
    const statusEl = document.getElementById('seller-product-status')
    if (statusEl) {
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (!user) {
      setStatus({ type: 'error', message: 'You must be logged in to manage products.' })
      return
    }

    const cleanedPoints = points.map((p) => p.trim()).filter(Boolean)
    if (!form.productName.trim() || !form.specification.trim() || cleanedPoints.length === 0) {
      setStatus({ type: 'error', message: 'Please fill in product name, specification, and at least one highlight.' })
      return
    }

    if (!thumbnail) {
      setStatus({ type: 'error', message: 'Please upload a thumbnail image.' })
      return
    }

    const selling = Number(form.sellingPrice)
    const max = Number(form.maxPrice)
    const quantity = Number(form.quantity)
    if (!selling || !max || selling <= 0 || max <= 0) {
      setStatus({ type: 'error', message: 'Please provide valid selling and MRP prices.' })
      return
    }
    if (max < selling) {
      setStatus({ type: 'error', message: 'MRP must be greater than or equal to selling price.' })
      return
    }
    if (!quantity || quantity <= 0) {
      setStatus({ type: 'error', message: 'Quantity must be greater than zero.' })
      return
    }

    const payload = {
      product_name: form.productName.trim(),
      specification: form.specification.trim(),
      points: cleanedPoints,
      thumbnail: thumbnail.preview,
      gallery: gallery.map((item) => item.preview),
      selling_price: selling,
      max_price: max,
      quantity,
      categories: form.category ? [form.category] : []
    }

    setSubmitting(true)
    try {
      if (isEditing && initialProduct?.id) {
        await updateSellerProduct(initialProduct.id || initialProduct._id, payload)
      } else {
        await createSellerProduct(payload)
      }
      setStatus({
        type: 'success',
        message: isEditing ? 'Product updated successfully.' : 'Product created successfully.'
      })
      setTimeout(() => navigate('/seller/products'), 800)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
      const statusEl = document.getElementById('seller-product-status')
      if (statusEl) {
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-xl p-6 space-y-6">
      {status.type && status.message && (
        <div
          id="seller-product-status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${status.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
        >
          {status.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-black text-slate-100 mb-2">
          Thumbnail Image <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="w-full text-sm text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-white/10 file:text-white hover:file:bg-white/20 border border-dashed border-white/10 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50 bg-[#0f172a]/50 placeholder-slate-400"
            required={!isEditing}
          />
        </div>
        {thumbnail && (
          <div className="mt-3 relative h-48 w-full rounded-2xl overflow-hidden border border-white/10 group">
            <img src={thumbnail.preview} alt="Thumbnail preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-black text-slate-100 mb-2">
          Gallery Images <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryChange}
          className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 border border-dashed border-white/10 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50 bg-[#0f172a]/50"
        />
        {gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {gallery.map((image, index) => (
              <div key={`${image.preview}-${index}`} className="relative h-20 rounded-xl overflow-hidden border border-white/10 bg-[#0f172a]">
                <img src={image.preview} className="h-full w-full object-cover" alt={`Gallery ${index}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div>
          <label className="block text-sm font-black text-slate-100 mb-2">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="productName"
            value={form.productName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition"
            placeholder="Enter product name"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-black text-slate-100 mb-2">
          Category <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <select
          value={form.category}
          name="category"
          onChange={handleChange}
          className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition appearance-none"
        >
          <option value="" className="text-slate-500">Select category</option>
          {categories.map((category) => {
            const categoryName = category.name || category
            const categoryId = category.id || category._id || categoryName
            const commissionRate = categoryCommissionRates[categoryName]
            return (
              <option key={categoryId} value={categoryName}>
                {categoryName}{commissionRate ? ` (${commissionRate}% commission)` : ''}
              </option>
            )
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <label className="block text-sm font-black text-slate-100 mb-2">
            Selling Price (₹) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="sellingPrice"
            value={form.sellingPrice}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition"
            placeholder="Enter selling price"
            required
          />
          {form.sellingPrice && (
            <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
              <div className="text-slate-300">
                <span className="font-medium text-slate-200">Total Price (with commission):</span>{' '}
                <span className="text-blue-400 font-bold">₹{calculateTotalPrice()}</span>
              </div>
              {categoryCommissionRates[form.category] && (
                <div className="text-xs text-slate-400 mt-1">
                  Commission: {categoryCommissionRates[form.category]}%
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-black text-slate-100 mb-2">
            MRP / Max Price (₹) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="maxPrice"
            value={form.maxPrice}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition"
            placeholder="Enter MRP"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-black text-slate-100 mb-2">
            Quantity <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition"
            placeholder="Enter available quantity"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-black text-slate-100 mb-2">
          Specification <span className="text-rose-500">*</span>
        </label>
        <textarea
          name="specification"
          value={form.specification}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition resize-none"
          placeholder="Describe the specification"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-black text-slate-100 mb-2">
          Highlights <span className="text-rose-500">*</span>
        </label>
        <div className="space-y-3">
          {points.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="mt-2 text-xs text-slate-500 w-4 text-right">{index + 1}.</span>
              <input
                type="text"
                value={point}
                onChange={(event) => handlePointChange(index, event.target.value)}
                className="flex-1 px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition"
                placeholder="Enter a bullet point"
              />
              {points.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePointField(index)}
                  className="p-2 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove this point"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddPointField}
            className="inline-flex items-center px-4 py-2 rounded-xl border border-dashed border-white/20 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            + Add another point
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all disabled:opacity-60 shadow-lg shadow-rose-900/20"
        >
          {submitting ? (isEditing ? 'Updating…' : 'Saving…') : isEditing ? 'Update Product' : 'Save Product'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/seller/products')}
          className="py-3.5 px-6 border border-white/10 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default SellerProductForm

