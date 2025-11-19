/**
 * Add Product Component
 */
import { useEffect, useRef, useState } from 'react'
import { createCategory, createProduct, getCategories, updateProduct } from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

function AddProduct({ editingProduct = null, onProductSaved = () => {}, onCancelEdit = () => {} }) {
  const [form, setForm] = useState({ productName: '', specification: '', sellingPrice: '', maxPrice: '' })
  const [media, setMedia] = useState({ thumbnail: null, gallery: [] })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableCategories, setAvailableCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryStatus, setCategoryStatus] = useState({ type: null, message: '' })
  const statusRef = useRef(null)

  const resetForm = () => {
    setForm({ productName: '', specification: '', sellingPrice: '', maxPrice: '' })
    setPoints(INITIAL_POINTS)
    setMedia({ thumbnail: null, gallery: [] })
    setSelectedCategory('')
  }
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setStatus({ type: null, message: '' })
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

  const convertFileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleThumbnailChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setMedia((prev) => ({ ...prev, thumbnail: null }))
      return
    }

    try {
      const dataUrl = await convertFileToDataUrl(file)
      setMedia((prev) => ({
        ...prev,
        thumbnail: {
          name: file.name,
          size: file.size,
          preview: dataUrl
        }
      }))
      setStatus({ type: null, message: '' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to read thumbnail image. Please try again.' })
    }
  }

  const handleGalleryChange = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      setMedia((prev) => ({ ...prev, gallery: [] }))
      return
    }

    try {
      const galleryItems = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          size: file.size,
          preview: await convertFileToDataUrl(file)
        }))
      )
      setMedia((prev) => ({ ...prev, gallery: galleryItems }))
      setStatus({ type: null, message: '' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to read gallery images. Please try again.' })
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const normalizeImagePayload = (image) => {
    if (!image) return null
    if (typeof image === 'string') {
      return { preview: image }
    }
    return image
  }

  const serializeImageForPayload = (image) => {
    if (!image) return null
    if (typeof image === 'string') return image
    if (image.preview) return image.preview
    return image
  }

  const serializeGalleryForPayload = (galleryItems) => {
    if (!Array.isArray(galleryItems)) return []
    return galleryItems
      .map((item) => serializeImageForPayload(item))
      .filter(Boolean)
  }

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories()
        setAvailableCategories(categories)
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (editingProduct) {
      setIsEditing(true)
      setEditingId(editingProduct.id || editingProduct._id || null)
      setForm({
        productName: editingProduct.product_name || '',
        specification: editingProduct.specification || '',
        sellingPrice: editingProduct.selling_price || editingProduct.price || '',
        maxPrice: editingProduct.max_price || editingProduct.mrp || ''
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
    } else {
      setIsEditing(false)
      setEditingId(null)
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanedPoints = points.map((p) => p.trim()).filter(Boolean)

    if (!form.productName.trim() || !form.specification.trim() || cleanedPoints.length === 0) {
      setStatus({
        type: 'error',
        message: 'Please fill in product name, specification, and at least one bullet point.'
      })
      return
    }

    if (!media.thumbnail) {
      setStatus({ type: 'error', message: 'Please upload a thumbnail image.' })
      return
    }

    const selling = Number(form.sellingPrice)
    const max = Number(form.maxPrice)
    if (!selling || !max) {
      setStatus({ type: 'error', message: 'Please enter both selling price and MRP.' })
      return
    }
    if (selling <= 0 || max <= 0) {
      setStatus({ type: 'error', message: 'Price values must be greater than zero.' })
      return
    }
    if (max < selling) {
      setStatus({ type: 'error', message: 'MRP must be greater than or equal to selling price.' })
      return
    }

    const payload = {
      product_name: form.productName.trim(),
      specification: form.specification.trim(),
      points: cleanedPoints,
      thumbnail: serializeImageForPayload(media.thumbnail),
      gallery: serializeGalleryForPayload(media.gallery),
      selling_price: selling,
      max_price: max,
      categories: selectedCategory ? [selectedCategory] : []
    }

    setIsSubmitting(true)
    try {
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
    }
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] gap-10">
      <div className="w-full max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Add Product</h2>

        {status.type && status.message && (
          <div
            ref={statusRef}
            className={`mb-6 p-4 rounded-lg border ${
              status.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Start with media <span className="text-xs text-gray-500">(upload first, then fill details)</span>
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Upload a cover image and optional gallery before entering specifications to keep assets ready.
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail Image <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-900 border border-dashed border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-black"
                  required={!isEditing || !media.thumbnail}
                />
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
              type="text"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="sellingPrice"
                value={form.sellingPrice}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter current selling price"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRP / Max Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="maxPrice"
                value={form.maxPrice}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Enter MRP (maximum price)"
                required
              />
            </div>
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
              Category <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition bg-white"
              >
                <option value="">Select category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
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
                    type="text"
                    value={point}
                    onChange={(e) => handlePointChange(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
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
              <p className="mt-1 text-xs text-gray-500">
                Each input is treated as one bullet point. Leave unused rows empty.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : isEditing ? 'Update Product' : 'Save Product'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onCancelEdit()
                }}
                className="py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
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
                    const newCategory = await createCategory(newCategoryName.trim())
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


