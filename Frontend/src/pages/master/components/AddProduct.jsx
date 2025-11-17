/**
 * Add Product Component
 */
import { useState } from 'react'
import { createProduct } from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

function AddProduct() {
  const [form, setForm] = useState({ productName: '', specification: '' })
  const [media, setMedia] = useState({ thumbnail: null, gallery: [] })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoryInput, setCategoryInput] = useState('')
  const [categoryOptions, setCategoryOptions] = useState([
    'Decor',
    'Electronics',
    'Gourmet',
    'Fashion',
    'Home Essentials'
  ])

  const resetForm = () => {
    setForm({ productName: '', specification: '' })
    setPoints(INITIAL_POINTS)
    setMedia({ thumbnail: null, gallery: [] })
    setCategories([])
    setCategoryInput('')
  }
  const handleAddCategory = () => {
    const value = categoryInput.trim()
    if (!value) return
    if (!categoryOptions.includes(value)) {
      setCategoryOptions((prev) => [...prev, value])
    }
    if (!categories.includes(value)) {
      setCategories((prev) => [...prev, value])
    }
    setCategoryInput('')
    setStatus({ type: null, message: '' })
  }

  const handleRemoveCategory = (category) => {
    setCategories((prev) => prev.filter((cat) => cat !== category))
    setStatus({ type: null, message: '' })
  }

  const handleCategorySelect = (event) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value)
    setCategories(selected)
    setStatus({ type: null, message: '' })
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

    const payload = {
      product_name: form.productName.trim(),
      specification: form.specification.trim(),
      points: cleanedPoints,
      thumbnail: media.thumbnail,
      gallery: media.gallery,
      categories
    }

    setIsSubmitting(true)
    try {
      const response = await createProduct(payload)
      setStatus({ type: 'success', message: response.message || 'Product saved successfully.' })
      resetForm()
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
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Displayed on product cards and listings.</p>
                {media.thumbnail && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">Thumbnail Preview</p>
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
                    {media.gallery.map((image) => (
                      <img
                        key={`${image.name}-${image.size}`}
                        src={image.preview}
                        alt={image.name}
                        className="h-20 w-full object-cover rounded-lg border"
                      />
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
              Categories <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <select
              multiple
              value={categories}
              onChange={handleCategorySelect}
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition bg-white"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {categories.map((category) => (
                  <span
                    key={`selected-${category}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                      aria-label={`Remove ${category}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
                placeholder="Add a new category"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select multiple categories or create new ones to organize storefronts.
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Saving product...' : 'Save Product'}
          </button>
        </form>
      </div>

    </div>
  )
}

export default AddProduct


