import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiPlus, FiBox, FiChevronDown, FiCheck } from 'react-icons/fi'
import {
  createSellerProduct,
  updateSellerProduct,
  getCategories,
  getCategoryCommissionRates,
  reserveImageEntityId,
  uploadEntityImage,
} from '../../../services/api'
import { resolveImageUrl, extractStaticPath } from '../../../utils/image'

function CategoryDropdown({ categories, selected, onSelect, commissionRates }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-white border border-slate-400 rounded-2xl text-slate-900 font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm flex items-center justify-between group hover:border-blue-600"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected || 'Select Category'}
        </span>
        <FiChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-slate-600'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden py-2"
            >
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => { onSelect(''); setIsOpen(false); }}
                  className="w-full px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Clear Selection
                </button>
                {categories.map((category) => {
                  const name = category.name || category
                  const id = category.id || category._id || name
                  const rate = commissionRates[name]
                  const isSelected = selected === name

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { onSelect(name); setIsOpen(false); }}
                      className={`w-full px-6 py-4 text-left flex items-center justify-between transition-all ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{name}</span>
                        {rate && <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>{rate}% Platform Fees</span>}
                      </div>
                      {isSelected && <FiCheck className="w-5 h-5" />}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const INITIAL_POINTS = ['', '', '']

function SellerProductForm({ initialProduct = null }) {
  const navigate = useNavigate()
  const { user, userType } = useSelector((state) => state.auth)

  const [form, setForm] = useState({
    productName: '',
    specification: '',
    sellingPrice: '',
    maxPrice: '',
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
        const data = await getCategories('product')
        const categoriesList = Array.isArray(data) ? data : (data?.categories || [])
        setCategories(categoriesList)

        // Load category commission rates - Only for Masters to prevent 403 for sellers
        if (userType === 'master') {
          try {
            const rates = await getCategoryCommissionRates()
            setCategoryCommissionRates(rates || {})
          } catch (err) {
            setCategoryCommissionRates({})
          }
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
        category: Array.isArray(initialProduct.categories) ? initialProduct.categories[0] : initialProduct.categories || ''
      })
      setPoints(
        Array.isArray(initialProduct.points) && initialProduct.points.length
          ? initialProduct.points
          : INITIAL_POINTS
      )
      setThumbnail(
        initialProduct.thumbnail
          ? { preview: resolveImageUrl(initialProduct.thumbnail) || initialProduct.thumbnail }
          : null
      )
      setGallery(
        Array.isArray(initialProduct.gallery)
          ? initialProduct.gallery.map((item) =>
            typeof item === 'string'
              ? { preview: resolveImageUrl(item) || item }
              : item
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
    setThumbnail({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    })
    setStatus({ type: null, message: '' })
  }

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      setGallery([])
      return
    }
    const items = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }))
    setGallery(items)
    setStatus({ type: null, message: '' })
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
    if (!selling || !max || selling <= 0 || max <= 0) {
      setStatus({ type: 'error', message: 'Please provide valid selling and MRP prices.' })
      return
    }
    if (max < selling) {
      setStatus({ type: 'error', message: 'MRP must be greater than or equal to selling price.' })
      return
    }

    setSubmitting(true)
    try {
      let entityId = initialProduct?.id || initialProduct?._id
      if (!entityId) {
        entityId = await reserveImageEntityId('products')
      }

      let thumbnailUrl = null
      if (thumbnail?.file) {
        const uploaded = await uploadEntityImage(thumbnail.file, {
          entityType: 'products',
          entityId,
          index: 0,
        })
        thumbnailUrl = uploaded.url
      } else {
        thumbnailUrl = extractStaticPath(thumbnail?.preview)
      }
      if (!thumbnailUrl) {
        setStatus({ type: 'error', message: 'Please upload a thumbnail image.' })
        setSubmitting(false)
        return
      }

      const galleryUrls = []
      for (let i = 0; i < gallery.length; i++) {
        const item = gallery[i]
        if (item.file) {
          const uploaded = await uploadEntityImage(item.file, {
            entityType: 'products',
            entityId,
            index: i + 1,
          })
          galleryUrls.push(uploaded.url)
        } else {
          const path = extractStaticPath(item.preview)
          if (path) galleryUrls.push(path)
        }
      }

      const payload = {
        product_name: form.productName.trim(),
        specification: form.specification.trim(),
        points: cleanedPoints,
        thumbnail: thumbnailUrl,
        gallery: galleryUrls,
        selling_price: selling,
        max_price: max,
        categories: form.category ? [form.category] : [],
        product_id: entityId,
      }

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
          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
            Product Thumbnail <span className="text-rose-600">*</span>
          </label>
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              required={!isEditing}
            />
            <div className={`relative h-56 w-full rounded-[2.5rem] border-[3px] border-dashed transition-all duration-500 flex flex-col items-center justify-center p-6 overflow-hidden ${thumbnail ? 'border-blue-500/30 bg-blue-50/5' : 'border-slate-300 bg-slate-100/50 hover:border-blue-400 hover:bg-white hover:shadow-2xl'}`}>
               {thumbnail ? (
                  <img src={thumbnail.preview} alt="Thumbnail preview" className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
               ) : (
                  <div className="text-center space-y-3">
                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 mx-auto group-hover:text-blue-500 group-hover:scale-110 transition-all">
                        <FiBox className="w-6 h-6" />
                     </div>
                     <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Upload Main Display</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supports JPG, PNG, WEBP</p>
                  </div>
               )}
               <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Update Thumbnail</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
            Product Gallery <span className="text-slate-500 font-semibold">(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-3 h-56">
            <div className="relative group border-[3px] border-dashed border-slate-300 rounded-[2rem] bg-slate-100/50 hover:bg-white hover:border-blue-400 hover:shadow-xl transition-all flex items-center justify-center cursor-pointer overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <FiPlus className="w-6 h-6 text-slate-500 group-hover:text-blue-500 group-hover:scale-125 transition-all" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Add More</span>
                </div>
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
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
              Product Name <span className="text-rose-600 font-semibold">*</span>
            </label>
            <input
              type="text"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              className="w-full px-6 py-4 bg-white border border-slate-300 rounded-2xl text-slate-900 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
              Category <span className="text-slate-500 font-semibold">(optional)</span>
            </label>
            <CategoryDropdown 
              categories={categories} 
              selected={form.category} 
              onSelect={(val) => setForm(prev => ({ ...prev, category: val }))}
              commissionRates={categoryCommissionRates}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
              Selling Price (₹) <span className="text-blue-700">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="sellingPrice"
              value={form.sellingPrice}
              onChange={handleChange}
              className="w-full px-6 py-5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
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
                <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Inclusive of commission & platform fees</p>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
              MRP (₹) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="maxPrice"
              value={form.maxPrice}
              onChange={handleChange}
              className="w-full px-6 py-5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="0.00"
              required
            />
          </div>

        </div>

        <div className="space-y-4">
          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
            Product Description <span className="text-blue-700">*</span>
          </label>
          <textarea
            name="specification"
            value={form.specification}
            onChange={handleChange}
            rows={6}
            className="w-full px-6 py-6 bg-white border border-slate-300 rounded-[2.5rem] text-slate-900 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
            placeholder="Detailed product description and technical details..."
            required
          />
        </div>

        <div className="space-y-6">
          <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-widest ml-1">
            Product Features <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-4">
            {points.map((point, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 md:gap-4 group"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-slate-600 border border-slate-200 shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={point}
                  onChange={(event) => handlePointChange(index, event.target.value)}
                  className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-300 rounded-xl md:rounded-2xl text-xs md:text-sm text-slate-800 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                  placeholder="Enter key feature..."
                />
                {points.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePointField(index)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            ))}
            <button
              type="button"
              onClick={handleAddPointField}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-3"
            >
              <FiPlus strokeWidth={3} /> Add Feature
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 md:gap-5 pt-8 pb-4">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 h-16 md:py-6 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-slate-900/20"
        >
          {submitting ? (isEditing ? 'SAVING...' : 'ADDING PRODUCT...') : isEditing ? 'UPDATE PRODUCT' : 'ADD PRODUCT'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/seller/products')}
          className="flex-1 h-16 md:px-10 md:py-6 border-2 border-rose-100 bg-rose-50/50 text-rose-600 text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:bg-rose-100 hover:text-rose-700 transition-all"
        >
          CANCEL
        </button>
      </div>
    </form>
  )
}

export default SellerProductForm

