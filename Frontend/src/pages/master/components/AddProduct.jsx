/**
 * Add Product Component
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createCategory,
  createProduct,
  getCategories,
  getSellers,
  updateProduct,
  getCategoryCommissionRates,
  reserveImageEntityId,
  uploadEntityImage,
} from '../../../services/api'
import { extractStaticPath, resolveImageUrl } from '../../../utils/image'

const INITIAL_POINTS = ['', '', '']

function AddProduct({ editingProduct = null, onProductSaved = () => { }, onCancelEdit = () => { } }) {
  const [form, setForm] = useState({ productName: '', specification: '', sellingPrice: '', maxPrice: '', commissionRate: '' })
  const [media, setMedia] = useState({ thumbnail: null, gallery: [] })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [availableSellers, setAvailableSellers] = useState([])
  const [selectedSellerId, setSelectedSellerId] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryStatus, setCategoryStatus] = useState({ type: null, message: '' })
  const [categoryCommissionRates, setCategoryCommissionRates] = useState({})
  const [appliedCategoryCommission, setAppliedCategoryCommission] = useState(null)
  const [isLoadingSellers, setIsLoadingSellers] = useState(true)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [errors, setErrors] = useState({})
  const [deliverySpanType, setDeliverySpanType] = useState('tomorrow')
  const [customDeliverySpan, setCustomDeliverySpan] = useState('')

  const nameRef = useRef(null)
  const sellerRef = useRef(null)
  const sellingPriceRef = useRef(null)
  const maxPriceRef = useRef(null)
  const specRef = useRef(null)
  const pointRef = useRef(null)
  const thumbnailRef = useRef(null)
  const statusRef = useRef(null)

  const selectedSeller = useMemo(() => {
    if (!selectedSellerId) return null
    const key = String(selectedSellerId)
    return (
      (Array.isArray(availableSellers) ? availableSellers : []).find(
        (seller) =>
          String(seller.trade_id || '') === key ||
          String(seller.id || seller._id || '') === key
      ) || null
    )
  }, [selectedSellerId, availableSellers])

  const resetForm = () => {
    setForm({ productName: '', specification: '', sellingPrice: '', maxPrice: '', commissionRate: '' })
    setPoints(INITIAL_POINTS)
    setMedia({ thumbnail: null, gallery: [] })
    setSelectedCategory('')
    setSelectedSellerId('')
    setErrors({})
    setDeliverySpanType('tomorrow')
    setCustomDeliverySpan('')
  }

  // Auto-apply category commission when category is selected
  useEffect(() => {
    if (selectedCategory && categoryCommissionRates[selectedCategory] && !form.commissionRate) {
      // Only auto-apply if no product-specific commission is set (priority: product > category)
      const categoryRate = categoryCommissionRates[selectedCategory]
      setForm(prev => ({ ...prev, commissionRate: String(categoryRate) }))
      setAppliedCategoryCommission(selectedCategory)
    } else if (!selectedCategory || !categoryCommissionRates[selectedCategory]) {
      setAppliedCategoryCommission(null)
    }
  }, [selectedCategory, categoryCommissionRates])

  // Calculate total selling price with commission
  // Priority: product-specific commission > category commission
  const calculateTotalSellingPrice = () => {
    const sellingPrice = parseFloat(form.sellingPrice) || 0
    if (sellingPrice <= 0) return ''

    // Priority 1: Product-specific commission
    let commissionRate = parseFloat(form.commissionRate) || 0

    // Priority 2: Category commission (only if no product-specific commission)
    if (commissionRate === 0 && selectedCategory && categoryCommissionRates[selectedCategory]) {
      commissionRate = parseFloat(categoryCommissionRates[selectedCategory]) || 0
    }

    if (commissionRate > 0) {
      const commissionAmount = (sellingPrice * commissionRate) / 100
      return (sellingPrice + commissionAmount).toFixed(2)
    }
    return sellingPrice.toFixed(2)
  }

  // Get the effective commission rate being used
  const getEffectiveCommissionRate = () => {
    const productRate = parseFloat(form.commissionRate) || 0
    if (productRate > 0) return { rate: productRate, source: 'product' }
    if (selectedCategory && categoryCommissionRates[selectedCategory]) {
      return { rate: parseFloat(categoryCommissionRates[selectedCategory]) || 0, source: 'category' }
    }
    return { rate: 0, source: 'none' }
  }
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setStatus({ type: null, message: '' })

    // Clear field-specific error
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev }
        delete newErrs[name]
        return newErrs
      })
    }

    // If product-specific commission is entered, clear category commission indicator
    if (name === 'commissionRate' && value) {
      setAppliedCategoryCommission(null)
    }
  }

  const handlePointChange = (index, value) => {
    setPoints((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
    setStatus({ type: null, message: '' })
  }

  const handleAddPointField = () => {
    setPoints((prev) => [...prev, ''])
    setStatus({ type: null, message: '' })
  }

  const handleRemovePointField = (index) => {
    setPoints((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, idx) => idx !== index)
    })
    setStatus({ type: null, message: '' })
  }

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setMedia((prev) => ({ ...prev, thumbnail: null }))
      return
    }

    setMedia((prev) => ({
      ...prev,
      thumbnail: {
        file,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
      },
    }))
    setStatus({ type: null, message: '' })
  }

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      setMedia((prev) => ({ ...prev, gallery: [] }))
      return
    }

    const galleryItems = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }))
    setMedia((prev) => ({ ...prev, gallery: galleryItems }))
    setStatus({ type: null, message: '' })
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const normalizeImagePayload = (image) => {
    if (!image) return null
    if (typeof image === 'string') {
      return { preview: resolveImageUrl(image) || image }
    }
    return image
  }

  useEffect(() => {
    const loadCategoriesAndSellers = async () => {
      try {
        setIsLoadingSellers(true)
        const [categories, sellersData, commissionRates] = await Promise.all([
          getCategories('product'),
          getSellers({ limit: 500 }),
          getCategoryCommissionRates().catch(() => ({}))
        ])
        setAvailableCategories(categories || [])
        // The getSellers utility now returns { sellers: [...] }
        setAvailableSellers(sellersData?.sellers || [])
        setCategoryCommissionRates(commissionRates || {})
      } catch (error) {
        console.error('Failed to load categories or sellers', error)
      } finally {
        setIsLoadingSellers(false)
      }
    }
    loadCategoriesAndSellers()
  }, [])

  useEffect(() => {
    if (editingProduct) {
      setIsEditing(true)
      setEditingId(editingProduct.id || editingProduct._id || null)
      setForm({
        productName: editingProduct.product_name || '',
        specification: editingProduct.specification || '',
        sellingPrice: editingProduct.selling_price || editingProduct.price || '',
        maxPrice: editingProduct.max_price || editingProduct.mrp || '',
        commissionRate: editingProduct.commission_rate || editingProduct.commissionRate || ''
      })
      setPoints(
        Array.isArray(editingProduct.points) && editingProduct.points.length
          ? editingProduct.points
          : INITIAL_POINTS
      )
      const existingCategories = Array.isArray(editingProduct.categories)
        ? editingProduct.categories
        : editingProduct.categories
          ? [editingProduct.categories]
          : []
      setSelectedCategory(existingCategories[0] || '')
      setMedia({
        thumbnail: normalizeImagePayload(editingProduct.thumbnail),
        gallery: Array.isArray(editingProduct.gallery)
          ? editingProduct.gallery.map((img) => normalizeImagePayload(img))
          : []
      })
      setStatus({ type: null, message: '' })
      const sellerIdFromProduct =
        editingProduct.seller_trade_id ||
        editingProduct.seller_id ||
        ''
      setSelectedSellerId(sellerIdFromProduct ? String(sellerIdFromProduct) : '')

      const ds = editingProduct.delivery_span ?? 2
      if (ds === 1) {
        setDeliverySpanType('today')
        setCustomDeliverySpan('')
      } else if (ds === 2) {
        setDeliverySpanType('tomorrow')
        setCustomDeliverySpan('')
      } else {
        setDeliverySpanType('custom')
        setCustomDeliverySpan(String(ds))
      }
    } else {
      setIsEditing(false)
      setEditingId(null)
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct])

  const sellerList = useMemo(
    () => (Array.isArray(availableSellers) ? availableSellers : []),
    [availableSellers]
  )

  useEffect(() => {
    if (!editingProduct || !sellerList.length) return

    const sellerIdFromProduct =
      editingProduct.seller_trade_id ||
      editingProduct.seller_id ||
      ''

    if (!sellerIdFromProduct) return

    const matchingSeller =
      sellerList.find(
        (seller) =>
          seller.trade_id === sellerIdFromProduct ||
          String(seller.id || seller._id || '') === String(sellerIdFromProduct)
      ) || null

    if (matchingSeller) {
      setSelectedSellerId(String(matchingSeller.trade_id || matchingSeller.id || matchingSeller._id))
    }
  }, [editingProduct, sellerList])

  const focusFirstField = (ref) => {
    if (!ref?.current) return
    requestAnimationFrame(() => {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ref.current.focus()
    })
  }

  const validateForm = () => {
    const newErrors = {}
    let firstErrorRef = null

    if (!selectedSellerId) {
      newErrors.selectedSellerId = 'Please assign a seller'
      if (!firstErrorRef) firstErrorRef = sellerRef
    } else if (!selectedSeller) {
      newErrors.selectedSellerId = 'Selected seller is no longer available. Please refresh and try again.'
      if (!firstErrorRef) firstErrorRef = sellerRef
    }

    if (!media.thumbnail) {
      newErrors.thumbnail = 'Thumbnail image is required'
      if (!firstErrorRef) firstErrorRef = thumbnailRef
    }

    if (!form.productName.trim()) {
      newErrors.productName = 'Product name is required'
      if (!firstErrorRef) firstErrorRef = nameRef
    }

    const selling = Number(form.sellingPrice)
    const max = Number(form.maxPrice)

    if (!form.sellingPrice || selling <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required'
      if (!firstErrorRef) firstErrorRef = sellingPriceRef
    }

    if (!form.maxPrice || max <= 0) {
      newErrors.maxPrice = 'Valid MRP is required'
      if (!firstErrorRef) firstErrorRef = maxPriceRef
    } else if (max < selling) {
      newErrors.maxPrice = 'MRP must be greater than or equal to selling price'
      if (!firstErrorRef) firstErrorRef = maxPriceRef
    }

    if (!form.specification.trim()) {
      newErrors.specification = 'Specification is required'
      if (!firstErrorRef) firstErrorRef = specRef
    }

    const hasPoints = points.some(p => p.trim())
    if (!hasPoints) {
      newErrors.points = 'At least one bullet point is required'
      if (!firstErrorRef) firstErrorRef = pointRef
    }

    if (deliverySpanType === 'custom') {
      const days = parseInt(customDeliverySpan, 10)
      if (isNaN(days) || days <= 2) {
        newErrors.deliverySpan = 'Delivery span for custom days must be greater than 2'
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setStatus({ type: null, message: '' })
      focusFirstField(firstErrorRef)
      return false
    }

    setErrors({})
    return true
  }

  const handleOpenSubmitConfirm = () => {
    if (validateForm()) {
      setShowConfirmSubmit(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    const cleanedPoints = points.map((p) => p.trim()).filter(Boolean)
    const selling = Number(form.sellingPrice)
    const max = Number(form.maxPrice)

    setIsSubmitting(true)
    try {
      let entityId = editingId
      if (!entityId) {
        entityId = await reserveImageEntityId('products')
      }

      let thumbnailUrl = null
      if (media.thumbnail?.file) {
        const uploaded = await uploadEntityImage(media.thumbnail.file, {
          entityType: 'products',
          entityId,
          index: 0,
        })
        thumbnailUrl = uploaded.url
      } else {
        thumbnailUrl = extractStaticPath(media.thumbnail?.preview)
      }
      if (!thumbnailUrl) {
        setErrors({ thumbnail: 'Please upload a thumbnail image.' })
        setStatus({ type: null, message: '' })
        focusFirstField(thumbnailRef)
        setIsSubmitting(false)
        return
      }

      const galleryUrls = []
      for (let i = 0; i < (media.gallery || []).length; i++) {
        const item = media.gallery[i]
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

      let deliverySpanValue = 2
      if (deliverySpanType === 'today') {
        deliverySpanValue = 1
      } else if (deliverySpanType === 'tomorrow') {
        deliverySpanValue = 2
      } else if (deliverySpanType === 'custom') {
        deliverySpanValue = parseInt(customDeliverySpan, 10)
      }

      const payload = {
        product_name: form.productName.trim(),
        specification: form.specification.trim(),
        points: cleanedPoints,
        thumbnail: thumbnailUrl,
        gallery: galleryUrls,
        selling_price: selling,
        max_price: max,
        commission_rate: form.commissionRate ? parseFloat(form.commissionRate) : null,
        categories: selectedCategory ? [selectedCategory] : [],
        seller_id: selectedSeller ? (selectedSeller.id || selectedSeller._id || null) : null,
        seller_trade_id: selectedSeller ? selectedSeller.trade_id || selectedSellerId : selectedSellerId,
        seller_name: selectedSeller ? `${selectedSeller.first_name || ''} ${selectedSeller.last_name || ''}`.trim() || selectedSeller.trade_id : selectedSellerId,
        seller_email: selectedSeller ? selectedSeller.email || null : null,
        seller_phone: selectedSeller ? selectedSeller.phone_number || null : null,
        product_id: entityId,
        delivery_span: deliverySpanValue,
      }

      if (isEditing && editingId) {
        await updateProduct(editingId, payload)
        setStatus({ type: 'success', message: 'Product updated successfully.' })
        resetForm()
        setIsEditing(false)
        setEditingId(null)
        onProductSaved()
        requestAnimationFrame(() => statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        onCancelEdit()
      } else {
        const response = await createProduct(payload)
        setStatus({ type: 'success', message: response.message || 'Product saved successfully.' })
        resetForm()
        onProductSaved()
        requestAnimationFrame(() => statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save product.' })
    } finally {
      setIsSubmitting(false)
      setShowConfirmSubmit(false)
    }
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] gap-10">
      <div className="w-full max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Add Product</h2>

        {status.type === 'success' && status.message && (
          <div
            ref={statusRef}
            className="mb-6 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800"
          >
            {status.message}
          </div>
        )}
        {status.type === 'error' && status.message && (
          <div
            ref={statusRef}
            className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800"
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Assign Seller <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">Select the seller account that owns this product listing.</p>
            {isLoadingSellers ? (
              <div className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Fetching all registered sellers...
              </div>
            ) : sellerList.length === 0 ? (
              <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                No active sellers found. Please register a seller first.
              </div>
            ) : (
              <select
                ref={sellerRef}
                value={selectedSellerId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedSellerId(val)
                  setStatus({ type: null, message: '' })
                  if (errors.selectedSellerId && val) {
                    setErrors(prev => {
                      const newErrs = { ...prev }
                      delete newErrs.selectedSellerId
                      return newErrs
                    })
                  }
                }}
                className={`w-full px-4 py-2.5 border ${errors.selectedSellerId ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition bg-white text-black font-bold`}
              >
                <option value="">Select seller</option>
                {sellerList.map((seller) => {
                  const optionValue = String(seller.trade_id || seller.id || seller._id)
                  const sellerName = `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
                  return (
                    <option key={optionValue} value={optionValue}>
                      {seller.trade_id || optionValue}{sellerName ? ` — ${sellerName}` : ''}
                    </option>
                  )
                })}
              </select>
            )}
            {errors.selectedSellerId && <p className="field-error-text text-xs mt-1 font-bold">{errors.selectedSellerId}</p>}
            {selectedSeller && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">
                  {selectedSeller.trade_id}
                  {selectedSeller.first_name || selectedSeller.last_name ? (
                    <span className="text-gray-500">
                      {' '}
                      • {(selectedSeller.first_name || '') + ' ' + (selectedSeller.last_name || '')}
                    </span>
                  ) : null}
                </div>
                {selectedSeller.email && <div>Email: {selectedSeller.email}</div>}
                {selectedSeller.phone_number && <div>Phone: {selectedSeller.phone_number}</div>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Start with media <span className="text-xs text-gray-500">(upload first, then fill details)</span>
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Upload a cover image and optional gallery before entering specifications to keep assets ready.
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <div
                  ref={thumbnailRef}
                  tabIndex="0"
                  className={`mt-1 border border-dashed ${errors.thumbnail ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-black`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-900 focus:outline-none"
                  />
                </div>
                {errors.thumbnail && <p className="field-error-text text-xs mt-1 font-bold">{errors.thumbnail}</p>}
                <p className="mt-1 text-xs text-gray-500">Displayed on product cards and listings.</p>
                {media.thumbnail && (
                  <div className="mt-3 relative">
                    <p className="text-xs text-gray-600 mb-2">Thumbnail Preview</p>
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => ({ ...prev, thumbnail: null }))}
                      className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-semibold rounded-full bg-white/80 text-gray-700 hover:bg-red-50 hover:text-red-600 border"
                      aria-label="Remove thumbnail"
                    >
                      ✕
                    </button>
                    <img
                      src={media.thumbnail.preview}
                      alt={media.thumbnail.name}
                      className="w-full max-h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gallery Images (for detailed view) <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black border border-dashed border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="mt-1 text-xs text-gray-500">
                  These appear when users open the product. Select multiple images to tell the full story.
                </p>
                {media.gallery.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {media.gallery.map((image, index) => (
                      <div key={`${image.preview}-${index}`} className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMedia((prev) => ({
                              ...prev,
                              gallery: prev.gallery.filter((_, idx) => idx !== index)
                            }))
                          }
                          className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-white/80 text-gray-700 hover:bg-red-50 hover:text-red-600 border"
                          aria-label="Remove gallery image"
                        >
                          ✕
                        </button>
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="h-20 w-full object-cover rounded-lg border"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border ${errors.productName ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-gray-900 font-medium`}
              placeholder="Enter product name"
            />
            {errors.productName && <p className="field-error-text text-xs mt-1 font-bold">{errors.productName}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                ref={sellingPriceRef}
                type="number"
                min="0"
                step="0.01"
                name="sellingPrice"
                value={form.sellingPrice}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border ${errors.sellingPrice ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-gray-900 font-medium`}
                placeholder="Enter current selling price"
              />
              {errors.sellingPrice && <p className="field-error-text text-xs mt-1 font-bold">{errors.sellingPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRP / Max Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                ref={maxPriceRef}
                type="number"
                min="0"
                step="0.01"
                name="maxPrice"
                value={form.maxPrice}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border ${errors.maxPrice ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-gray-900 font-medium`}
                placeholder="Enter MRP (maximum price)"
              />
              {errors.maxPrice && <p className="field-error-text text-xs mt-1 font-bold">{errors.maxPrice}</p>}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Rate (%) <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                name="commissionRate"
                value={form.commissionRate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-gray-900 font-medium"
                placeholder="e.g., 5.5"
              />
              {appliedCategoryCommission && !form.commissionRate && (
                <p className="text-xs text-blue-600 mt-1">
                  Category "{appliedCategoryCommission}" commission ({categoryCommissionRates[appliedCategoryCommission]}%) applied
                </p>
              )}
              {form.commissionRate && (
                <p className="text-xs text-green-600 mt-1">
                  Product-specific commission (overrides category)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Commission is calculated on selling price. Product commission has priority over category.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Selling Price (₹)
              </label>
              <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                {calculateTotalSellingPrice() ? `₹${Number(calculateTotalSellingPrice()).toLocaleString('en-IN')}` : 'Enter selling price'}
              </div>
              {(() => {
                const effective = getEffectiveCommissionRate()
                if (effective.rate > 0) {
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                      Includes {effective.rate}% commission ({effective.source === 'product' ? 'product-specific' : 'category'})
                    </p>
                  )
                }
                return <p className="text-xs text-gray-500 mt-1">Selling price + Commission</p>
              })()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Delivery Span <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">Select the delivery timeframe for this product.</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setDeliverySpanType('today')
                  setErrors(prev => { const newErrs = { ...prev }; delete newErrs.deliverySpan; return newErrs })
                }}
                className={`py-3 px-4 rounded-xl border text-center font-bold transition-all ${
                  deliverySpanType === 'today'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeliverySpanType('tomorrow')
                  setErrors(prev => { const newErrs = { ...prev }; delete newErrs.deliverySpan; return newErrs })
                }}
                className={`py-3 px-4 rounded-xl border text-center font-bold transition-all ${
                  deliverySpanType === 'tomorrow'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeliverySpanType('custom')
                }}
                className={`py-3 px-4 rounded-xl border text-center font-bold transition-all ${
                  deliverySpanType === 'custom'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                }`}
              >
                Custom Days
              </button>
            </div>

            {deliverySpanType === 'custom' && (
              <div className="mt-2 transition-all duration-300">
                <input
                  type="number"
                  min="3"
                  value={customDeliverySpan}
                  onChange={(e) => {
                    setCustomDeliverySpan(e.target.value)
                    setErrors(prev => { const newErrs = { ...prev }; delete newErrs.deliverySpan; return newErrs })
                  }}
                  className={`w-full px-4 py-2.5 border ${
                    errors.deliverySpan ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-gray-900 font-semibold`}
                  placeholder="Enter number of days (should be > 2)"
                />
              </div>
            )}
            {errors.deliverySpan && (
              <p className="field-error-text text-xs mt-1 font-bold">{errors.deliverySpan}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specification <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={specRef}
              name="specification"
              value={form.specification}
              onChange={handleChange}
              rows={4}
              className={`w-full px-4 py-2.5 border ${errors.specification ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-none text-black font-bold`}
              placeholder="Describe the specification"
            />
            {errors.specification && <p className="field-error-text text-xs mt-1 font-bold">{errors.specification}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-xs text-gray-500">(optional - commission auto-applied if set)</span>
            </label>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  // Clear product-specific commission when category changes to allow category commission
                  if (e.target.value && categoryCommissionRates[e.target.value]) {
                    setForm(prev => ({ ...prev, commissionRate: '' }))
                  }
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition bg-white text-black font-bold"
              >
                <option value="">Select category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                    {categoryCommissionRates[category.name] ? ` (${categoryCommissionRates[category.name]}% commission)` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setCategoryStatus({ type: null, message: '' })
                  setShowCategoryModal(true)
                }}
                className="px-4 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select a category or create a new one to organize storefronts. Only one category can be assigned per product.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points Related To It <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {points.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="mt-2 text-xs text-gray-400 w-4 text-right">{index + 1}.</span>
                  <input
                    ref={index === 0 ? pointRef : null}
                    type="text"
                    value={point}
                    onChange={(e) => handlePointChange(index, e.target.value)}
                    className={`flex-1 px-4 py-2.5 border ${errors.points && index === 0 ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition text-black font-bold`}
                    placeholder="Enter a bullet point"
                  />
                  {points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePointField(index)}
                      className="p-2 text-xs text-red-600 hover:text-red-800"
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
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-dashed border-gray-400 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add another point
              </button>
              {errors.points && <p className="field-error-text text-xs mt-1 font-bold">{errors.points}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Each input is treated as one bullet point. Leave unused rows empty.
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-8 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="px-8 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              {isEditing ? 'Cancel Edit' : 'Reset Form'}
            </button>
            <button
              type="button"
              onClick={handleOpenSubmitConfirm}
              disabled={isSubmitting}
              className="px-10 py-3 rounded-xl bg-black text-white font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : isEditing ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modals */}
      {showConfirmReset && (
        <div className="master-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="master-modal-panel bg-white rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-gray-500 mb-8 font-medium">This will clear all the information you've entered so far. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50">No, stay</button>
              <button
                onClick={() => {
                  isEditing ? onCancelEdit() : resetForm();
                  setShowConfirmReset(false);
                }}
                className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSubmit && (
        <div className="master-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="master-modal-panel bg-white rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm {isEditing ? 'Update' : 'Creation'}</h3>
            <p className="text-gray-500 mb-8 font-medium">Ready to {isEditing ? 'update this product' : 'list this new product'} on the marketplace? Make sure all details are accurate.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50">Review</button>
              <button
                onClick={(e) => handleSubmit(e)}
                className="flex-1 py-4 rounded-2xl bg-black text-white font-bold hover:bg-gray-800"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}


      {showCategoryModal && (
        <div className="master-modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="master-modal-panel bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Add Category</h3>
            {categoryStatus.type && (
              <p className={`text-sm mb-3 ${categoryStatus.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {categoryStatus.message}
              </p>
            )}
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition mb-4"
              placeholder="Enter category name"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategoryName('')
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newCategoryName.trim()) {
                    setCategoryStatus({ type: 'error', message: 'Category name is required.' })
                    return
                  }
                  try {
                    const newCategory = await createCategory(newCategoryName.trim(), 'product')
                    setAvailableCategories((prev) => [...prev, newCategory])
                    setSelectedCategory(newCategory.name)
                    setCategoryStatus({ type: 'success', message: 'Category added successfully.' })
                    setNewCategoryName('')
                    setShowCategoryModal(false)
                  } catch (error) {
                    setCategoryStatus({ type: 'error', message: error.message })
                  }
                }}
                className="px-5 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AddProduct


