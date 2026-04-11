import { useState, useEffect } from 'react'
import { FiPlus, FiX, FiCheck, FiInfo, FiSave } from 'react-icons/fi'
import { createService, updateService, getCategories, getSellers } from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

const convertFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function AddService({ editingService = null, onServiceSaved = () => {}, onCancelEdit = () => {} }) {
  const [form, setForm] = useState({
    serviceName: '',
    description: '',
    serviceCharge: '',
    category: '',
    sellerTradeId: '',
    availability: true
  })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [thumbnail, setThumbnail] = useState(null)
  const [gallery, setGallery] = useState([])
  const [categories, setCategories] = useState([])
  const [sellers, setSellers] = useState([])
  const [status, setStatus] = useState({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [isLoadingSellers, setIsLoadingSellers] = useState(true)

  // Populate form if editing
  useEffect(() => {
    if (editingService) {
      setForm({
        serviceName: editingService.service_name || '',
        description: editingService.description || '',
        serviceCharge: editingService.service_charge || '',
        category: editingService.categories?.[0] || '',
        sellerTradeId: editingService.seller_trade_id || '',
        availability: editingService.availability !== false
      })
      setPoints(editingService.points && editingService.points.length > 0 ? editingService.points : INITIAL_POINTS)
      // For existing images, we store the URL in 'preview' and null in 'file'
      if (editingService.thumbnail) {
        setThumbnail({ preview: editingService.thumbnail, file: null })
      }
      if (editingService.gallery && Array.isArray(editingService.gallery)) {
        setGallery(editingService.gallery.map(url => ({ preview: url, file: null })))
      }
    } else {
      resetForm()
    }
  }, [editingService])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingSellers(true)
        const cats = await getCategories()
        const sellersData = await getSellers({ limit: 500 })
        // Check if cats is already an array or needs to be extracted
        const categoryList = Array.isArray(cats) ? cats : (cats?.categories || [])
        setCategories(categoryList)
        setSellers(sellersData?.sellers || [])
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setIsLoadingSellers(false)
      }
    }
    fetchData()
  }, [])

  const resetForm = () => {
    setForm({
      serviceName: '',
      description: '',
      serviceCharge: '',
      category: '',
      sellerTradeId: '',
      availability: true
    })
    setPoints(INITIAL_POINTS)
    setThumbnail(null)
    setGallery([])
    setStatus({ type: null, message: '' })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handlePointChange = (index, value) => {
    const updated = [...points]
    updated[index] = value
    setPoints(updated)
  }

  const handleAddPoint = () => setPoints([...points, ''])
  const handleRemovePoint = (i) => points.length > 1 && setPoints(points.filter((_, idx) => idx !== i))

  const handleThumbnailChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) setThumbnail({ preview: await convertFileToDataUrl(file), file })
  }

  const handleGalleryChange = async (e) => {
    const files = Array.from(e.target.files || [])
    const newImgs = await Promise.all(files.map(async f => ({ preview: await convertFileToDataUrl(f), file: f })))
    setGallery([...gallery, ...newImgs])
  }

  const handleRemoveGalleryImage = (index) => {
    setGallery(gallery.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanedPoints = points.map(p => p.trim()).filter(Boolean)
    if (!form.serviceName || !form.serviceCharge || !form.sellerTradeId || !thumbnail) {
      setStatus({ type: 'error', message: 'Required fields and thumbnail missing' })
      return
    }

    const selectedSeller = sellers.find(s => s.trade_id === form.sellerTradeId)

    const payload = {
      service_name: form.serviceName,
      description: form.description,
      points: cleanedPoints,
      thumbnail: thumbnail.preview,
      gallery: gallery.map(img => img.preview),
      service_charge: Number(form.serviceCharge),
      categories: form.category ? [form.category] : [],
      seller_trade_id: form.sellerTradeId,
      seller_name: selectedSeller ? `${selectedSeller.first_name || ''} ${selectedSeller.last_name || ''}`.trim() : '',
      seller_email: selectedSeller?.email || '',
      seller_phone: selectedSeller?.phone_number || '',
      availability: form.availability
    }

    setSubmitting(true)
    try {
      if (editingService) {
        await updateService(editingService.id || editingService._id, payload)
        setStatus({ type: 'success', message: 'Service updated successfully!' })
        setTimeout(() => onServiceSaved(), 1500)
      } else {
        await createService(payload)
        setStatus({ type: 'success', message: 'Service created successfully!' })
        resetForm()
        onServiceSaved()
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-50 flex-wrap">
        <div className="p-3 bg-gray-900 text-white rounded-xl"><FiPlus className="w-6 h-6" /></div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingService ? `Edit Service: ${editingService.service_name}` : 'Add New Master Service'}
          </h2>
          <p className="text-gray-500">
            {editingService ? 'Modify existing service details' : 'List a service directly on the marketplace'}
          </p>
        </div>
        {editingService && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {status.message && (
          <div className={`p-4 rounded-xl font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column: Basic Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Service Name *</label>
              <input type="text" name="serviceName" value={form.serviceName} onChange={handleChange} required className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none text-black font-bold" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Assign to Seller *</label>
              {isLoadingSellers ? (
                <div className="w-full h-12 px-4 rounded-xl border border-gray-300 flex items-center gap-2 text-sm text-gray-500 bg-gray-50/50">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Loading sellers...
                </div>
              ) : sellers.length === 0 ? (
                <div className="w-full h-12 px-4 rounded-xl border border-rose-200 bg-rose-50 flex items-center text-sm text-rose-600 font-bold">
                  No sellers available. Record a seller in List Sellers first.
                </div>
              ) : (
                <select name="sellerTradeId" value={form.sellerTradeId} onChange={handleChange} required className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none bg-white text-black font-bold">
                  <option value="">Select Seller</option>
                  {sellers.map(s => <option key={s.id || s.trade_id} value={s.trade_id}>{s.trade_id} ({s.first_name || 'No Name'})</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Charge (₹) *</label>
                <input type="number" name="serviceCharge" value={form.serviceCharge} onChange={handleChange} required className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none text-black font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none bg-white text-black font-bold">
                  <option value="">Select Category</option>
                  {categories.map(c => {
                    const catName = typeof c === 'string' ? c : (c.name || c.id || '')
                    const catId = typeof c === 'string' ? c : (c.id || c._id || c.name)
                    return <option key={catId} value={catName}>{catName}</option>
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><FiInfo className="text-gray-400" /> Service Description & Requirements</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={5} className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none resize-none text-black font-bold" placeholder="Describe the fan repair, instrument details, etc."></textarea>
            </div>
          </div>

          {/* Right Column: Media & Highlights */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Thumbnail (Required)</label>
              <div className="relative h-44 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 transition-all overflow-hidden flex items-center justify-center bg-gray-50">
                {thumbnail ? (
                  <div className="relative w-full h-full">
                    <img src={thumbnail.preview} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setThumbnail(null)}
                      className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 hover:bg-white"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div className="text-center font-bold text-gray-400">Click to upload banner</div>
                )}
                <input type="file" onChange={handleThumbnailChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Gallery Images</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {gallery.map((img, idx) => (
                  <div key={idx} className="relative h-24 rounded-lg overflow-hidden group">
                    <img src={img.preview} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <div className="relative h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                  <FiPlus className="text-gray-400 w-6 h-6" />
                  <input type="file" multiple onChange={handleGalleryChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Service Highlights (Bullets)</label>
              <div className="space-y-2">
                {points.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={p} onChange={(e) => handlePointChange(i, e.target.value)} className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-sm text-black font-bold" placeholder="Bullet point..." />
                    {points.length > 1 && <button type="button" onClick={() => handleRemovePoint(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><FiX /></button>}
                  </div>
                ))}
                <button type="button" onClick={handleAddPoint} className="text-xs font-bold text-gray-500 hover:text-black font-bold">+ Add Point</button>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <input type="checkbox" name="availability" checked={form.availability} onChange={handleChange} className="w-5 h-5 accent-black font-bold" />
              <span className="text-sm font-bold text-gray-700">Currently Available for Booking</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={editingService ? onCancelEdit : resetForm}
            className="px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all font-bold"
          >
            {editingService ? 'Cancel Edit' : 'Reset Form'}
          </button>
          <button 
            type="submit" 
            disabled={submitting} 
            className={`px-10 py-3 rounded-xl bg-black text-white font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 font-bold`}
          >
            {submitting ? 'Processing...' : (
              <>
                {editingService ? <FiSave /> : <FiPlus />}
                {editingService ? 'Update Service' : 'Create Service'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddService
