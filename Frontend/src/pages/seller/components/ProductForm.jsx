import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiBox } from 'react-icons/fi'
import { motion } from 'framer-motion'
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
    <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] p-8 md:p-10 space-y-10">
      {status.type && status.message && (
        <motion.div
          id="seller-product-status"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[1.25rem] border px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 ${status.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
            : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}
        >
          <div className={`w-2 h-2 rounded-full ${status.type === 'success' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
          {status.message}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
            Visual Identity <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              required={!isEditing}
            />
            <div className={`relative h-56 w-full rounded-[2.5rem] border-[3px] border-dashed transition-all duration-500 flex flex-col items-center justify-center p-6 overflow-hidden ${thumbnail ? 'border-blue-500/30 bg-blue-50/5' : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-white hover:shadow-xl'}`}>
               {thumbnail ? (
                  <img src={thumbnail.preview} alt="Thumbnail preview" className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
               ) : (
                  <div className="text-center space-y-3">
                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-50 mx-auto">
                        <FiBox className="w-6 h-6" />
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Main Display</p>
                  </div>
               )}
               <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Update Thumbnail</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
            Asset Gallery <span className="text-slate-300 font-bold">(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-3 h-56">
            <div className="relative group border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30 hover:bg-white hover:border-blue-200 transition-all flex items-center justify-center cursor-pointer overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <FiPlus className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            {gallery.map((image, index) => (
              <div key={`${image.preview}-${index}`} className="relative rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group">
                <img src={image.preview} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt={`Gallery ${index}`} />
                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Asset Designation <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Market Segment <span className="text-slate-300 font-bold">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={form.category}
                name="category"
                onChange={handleChange}
                className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner appearance-none"
              >
                <option value="" className="text-slate-400">SELECT CLASSIFICATION</option>
                {categories.map((category) => {
                  const categoryName = category.name || category
                  const categoryId = category.id || category._id || categoryName
                  const commissionRate = categoryCommissionRates[categoryName]
                  return (
                    <option key={categoryId} value={categoryName}>
                      {categoryName.toUpperCase()} {commissionRate ? `[${commissionRate}% FEES]` : ''}
                    </option>
                  )
                })}
              </select>
              <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-slate-400">
                <FiBox className="w-4 h-4 opacity-30" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              Valuation (₹) <span className="text-blue-600">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="sellingPrice"
              value={form.sellingPrice}
              onChange={handleChange}
              className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              placeholder="0.00"
              required
            />
            {form.sellingPrice && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 rounded-[1.75rem] shadow-sm"
              >
                <div className="flex items-center justify-between">
                   <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Listing Protocol Price</div>
                   <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">₹{calculateTotalPrice()}</div>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Inclusive of commission & platform fees</p>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              Reference MRP (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="maxPrice"
              value={form.maxPrice}
              onChange={handleChange}
              className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              Inventory Depth <span className="text-blue-600">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              placeholder="Units available"
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            Technical Specification <span className="text-blue-600">*</span>
          </label>
          <textarea
            name="specification"
            value={form.specification}
            onChange={handleChange}
            rows={6}
            className="w-full px-6 py-6 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] text-slate-900 font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner resize-none"
            placeholder="Detailed asset characterization and technical parameters..."
            required
          />
        </div>

        <div className="space-y-6">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
            Asset Highlights <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-4">
            {points.map((point, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={point}
                  onChange={(event) => handlePointChange(index, event.target.value)}
                  className="flex-1 px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-800 font-bold placeholder:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="Enter unique feature..."
                />
                {points.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePointField(index)}
                    className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            ))}
            <button
              type="button"
              onClick={handleAddPointField}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-3"
            >
              <FiPlus strokeWidth={3} /> ADD DIMENSION
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 pt-8">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-6 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-slate-900/20"
        >
          {submitting ? (isEditing ? 'TRANSMITTING...' : 'INITIALIZING...') : isEditing ? 'COMMIT UPDATES' : 'DEPLOY ASSET'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/seller/products')}
          className="px-10 py-6 border border-slate-100 bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:bg-white hover:text-slate-900 transition-all"
        >
          ABORT
        </button>
      </div>
    </form>
  )
}

export default SellerProductForm

