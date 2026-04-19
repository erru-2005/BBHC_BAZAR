import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiX, FiCheck, FiInfo, FiBox } from 'react-icons/fi'
import { motion } from 'framer-motion'
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
    <div className="max-w-4xl mx-auto py-2">
      <form onSubmit={handleSubmit} className="space-y-10">
        {status.message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-[1.5rem] border text-xs font-black uppercase tracking-widest flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
          >
            <div className={`w-2 h-2 rounded-full ${status.type === 'success' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
            {status.message}
          </motion.div>
        )}

        {/* Media Section */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Visual Representation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hero Banner</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleThumbnailChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`h-56 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 overflow-hidden ${thumbnail ? 'border-blue-500/30 bg-blue-50/5' : 'border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-white'}`}>
                  {thumbnail ? (
                    <img src={thumbnail.preview} className="w-full h-full object-cover rounded-[1.5rem] transition-transform duration-1000 group-hover:scale-105" alt="Preview" />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mx-auto text-slate-300 transition-colors group-hover:text-blue-500"><FiPlus className="w-6 h-6" /></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Upload Display Banner</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                     <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Change Banner</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Portfolio</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative group aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-100 bg-slate-50/50 flex items-center justify-center cursor-pointer hover:border-blue-200 hover:bg-white transition-all overflow-hidden shrink-0">
                  <FiPlus className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" strokeWidth={3} />
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleGalleryChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {gallery.map((img, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={i} 
                    className="relative aspect-square rounded-[1.5rem] overflow-hidden group border border-slate-100 shadow-sm"
                  >
                    <img src={img.preview} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <button 
                      type="button" 
                      onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Basic Info Section */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Service Blueprint
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Service Designation</label>
              <input 
                type="text" 
                name="serviceName"
                value={form.serviceName}
                onChange={handleChange}
                placeholder="e.g. HIGH-DEFINITION ARCHITECTURAL RENDERING"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-200 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Expertise Domain <span className="text-blue-600">*</span>
              </label>
              <div className="relative group">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-slate-900 font-black appearance-none transition-all shadow-inner group-hover:border-blue-200"
                  required
                >
                  <option value="" className="text-slate-400">SELECT CLASSIFICATION</option>
                  {categories.map(c => {
                    const name = typeof c === 'object' ? (c.name || '') : (c || '')
                    const val = typeof c === 'object' ? (c.id || c._id || name) : (c || '')
                    return (
                      <option key={val} value={name}>
                        {name ? name.toUpperCase() : 'UNKNOWN'}
                      </option>
                    )
                  })}
                </select>
                <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-blue-600/30 group-hover:text-blue-600 transition-colors">
                   <FiBox className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Standard Rate (₹)</label>
              <input 
                type="number" 
                name="serviceCharge"
                value={form.serviceCharge}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-200 transition-all shadow-inner"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 ml-1">
                <FiInfo className="w-3.5 h-3.5" /> WORKFLOW SPECIFICATIONS
              </label>
              <textarea 
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Elaborate on your unique approach, technical stack, or project requirements..."
                rows={5}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-[2rem] px-6 py-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-slate-900 font-medium placeholder:text-slate-200 transition-all shadow-inner resize-none"
              ></textarea>
            </div>
          </div>
        </section>
        {/* Highlights Section */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Value Propositions
          </h2>
          
          <div className="space-y-4">
            {points.map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                  0{i + 1}
                </div>
                <input 
                  type="text" 
                  value={p}
                  onChange={(e) => handlePointChange(i, e.target.value)}
                  placeholder="Key feature or benefit..."
                  className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-slate-900 font-bold placeholder:text-slate-300 transition-all shadow-inner"
                />
              </motion.div>
            ))}
            <button 
              type="button" 
              onClick={handleAddPoint}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:bg-slate-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-3"
            >
              <FiPlus strokeWidth={3} className="w-4 h-4" /> RECRUIT NEW HIGHLIGHT
            </button>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-6 pt-10 pb-12">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.5)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="flex-[2] h-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.5em] rounded-[2.5rem] shadow-xl shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {submitting ? 'TRANSMITTING...' : <><FiCheck className="w-5 h-5" strokeWidth={3} /> DEPLOY SERVICE</>}
          </motion.button>
          
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-20 bg-white border-2 border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] rounded-[2.5rem] hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200 transition-all active:scale-[0.98]"
          >
            ABORT
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServiceForm
