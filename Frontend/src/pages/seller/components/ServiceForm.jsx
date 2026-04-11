import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiCheck, FiInfo } from 'react-icons/fi'
import { createSellerService, getCategories } from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

const convertFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function ServiceForm() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [form, setForm] = useState({
    serviceName: '',
    description: '',
    serviceCharge: '',
    category: '',
    availability: true
  })
  const [points, setPoints] = useState(INITIAL_POINTS)
  const [thumbnail, setThumbnail] = useState(null)
  const [gallery, setGallery] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories()
        const categoriesList = Array.isArray(data) ? data : (data?.categories || [])
        setCategories(categoriesList)
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    loadCategories()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
    setStatus({ type: null, message: '' })
  }

  const handlePointChange = (index, value) => {
    setPoints((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const handleAddPoint = () => setPoints([...points, ''])
  const handleRemovePoint = (index) => {
    if (points.length > 1) {
      setPoints(points.filter((_, i) => i !== index))
    }
  }

  const handleThumbnailChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await convertFileToDataUrl(file)
      setThumbnail({ preview: dataUrl, file })
    } catch (err) {
      console.error(err)
    }
  }

  const handleGalleryChange = async (e) => {
    const files = Array.from(e.target.files || [])
    try {
      const newImages = await Promise.all(
        files.map(async (file) => ({
          preview: await convertFileToDataUrl(file),
          file
        }))
      )
      setGallery([...gallery, ...newImages])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setStatus({ type: 'error', message: 'Auth required' })
      return
    }

    const cleanedPoints = points.map(p => p.trim()).filter(Boolean)
    if (!form.serviceName || !form.description || cleanedPoints.length === 0 || !thumbnail) {
      setStatus({ type: 'error', message: 'Please fill all required fields and upload a thumbnail.' })
      return
    }

    const payload = {
      service_name: form.serviceName,
      description: form.description,
      points: cleanedPoints,
      thumbnail: thumbnail.preview,
      gallery: gallery.map(img => img.preview),
      service_charge: Number(form.serviceCharge),
      categories: form.category ? [form.category] : [],
      availability: form.availability
    }

    setSubmitting(true)
    try {
      await createSellerService(payload)
      setStatus({ type: 'success', message: 'Service submitted for approval!' })
      setTimeout(() => navigate('/seller/dashboard'), 1500)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <FiPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white px-2">Add New Service</h1>
          <p className="text-slate-400 text-sm px-2">Create a service listing (e.g. Fan Repair, Music Band, Plumbing)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {status.message && (
          <div className={`p-4 rounded-2xl border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {status.message}
          </div>
        )}

        {/* Media Section */}
        <section className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 space-y-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Service Banner & Gallery
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-slate-300 mb-3">Main Thumbnail (Required)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleThumbnailChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 ${thumbnail ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  {thumbnail ? (
                    <img src={thumbnail.preview} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                  ) : (
                    <>
                      <div className="p-3 rounded-full bg-white/5 mb-2"><FiPlus className="w-5 h-5" /></div>
                      <span className="text-xs font-bold text-slate-400">Click to upload banner</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-300 mb-3">Gallery Photos (Optional)</label>
              <div className="grid grid-cols-3 gap-3">
                {gallery.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img.preview} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="relative aspect-square rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center cursor-pointer hover:border-white/20 transition-all">
                  <FiPlus className="w-5 h-5 text-slate-500" />
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleGalleryChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Basic Info Section */}
        <section className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 space-y-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Service Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Service Name</label>
              <input 
                type="text" 
                name="serviceName"
                value={form.serviceName}
                onChange={handleChange}
                placeholder="e.g. Electric Fan Repair & Installation"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Service Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold appearance-none"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Service Charge (₹)</label>
              <input 
                type="number" 
                name="serviceCharge"
                value={form.serviceCharge}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 text-indigo-400 flex items-center gap-2">
                <FiInfo /> Specific Service Features / Requirements
              </label>
              <textarea 
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Specify what exactly you provide, instruments you play, types of repair, or function requirements..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-medium"
              ></textarea>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 space-y-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Service Highlights
          </h2>
          
          <div className="space-y-4">
            {points.map((point, index) => (
              <div key={index} className="flex gap-2">
                <input 
                  type="text"
                  value={point}
                  onChange={(e) => handlePointChange(index, e.target.value)}
                  placeholder={`Highlight ${index + 1} (e.g. 24/7 Availability, Expert Technician)`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                />
                <button 
                  type="button" 
                  onClick={() => handleRemovePoint(index)}
                  className="p-3 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
                >
                  <FiX />
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={handleAddPoint}
              className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs font-black text-slate-400 hover:bg-white/5 transition-all"
            >
              + Add Another Highlight
            </button>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-20">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-16 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {submitting ? 'Submitting...' : <><FiCheck className="w-5 h-5" /> Submit Service</>}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 h-16 bg-white/5 border border-white/10 text-white font-bold rounded-[24px] hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServiceForm
