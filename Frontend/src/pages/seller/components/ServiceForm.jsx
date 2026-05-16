import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiPlus, FiX, FiCheck, FiInfo, FiBox, FiChevronDown } from 'react-icons/fi'
import { createSellerService, getCategories } from '../../../services/api'

const INITIAL_POINTS = ['', '', '']

const convertFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function CategoryDropdown({ categories, selected, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm flex items-center justify-between group hover:border-blue-400"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.toUpperCase() : 'SELECT CATEGORY'}
        </span>
        <FiChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden py-2"
            >
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => { onSelect(''); setIsOpen(false); }}
                  className="w-full px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Clear Selection
                </button>
                {categories.map((c) => {
                  const name = typeof c === 'object' ? (c.name || '') : (c || '')
                  const val = typeof c === 'object' ? (c.id || c._id || name) : (c || '')
                  const isSelected = selected === name

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { onSelect(name); setIsOpen(false); }}
                      className={`w-full px-6 py-4 text-left flex items-center justify-between transition-all ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'}`}
                    >
                      <span className="font-bold text-sm uppercase">{name}</span>
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

function ServiceForm({ onClose }) {
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
      setTimeout(() => {
        if (onClose) {
          onClose()
        } else {
          navigate('/seller/dashboard')
        }
      }, 1500)
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
            className={`p-6 rounded-[1.5rem] border text-xs font-semibold uppercase tracking-widest flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}
          >
            <div className={`w-2 h-2 rounded-full ${status.type === 'success' ? 'bg-emerald-700 animate-pulse' : 'bg-rose-700'}`} />
            {status.message}
          </motion.div>
        )}

        {/* Media Section */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm">
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-700 rounded-full" />
            Service Media
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Service Thumbnail</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleThumbnailChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`h-56 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 overflow-hidden ${thumbnail ? 'border-blue-500/30 bg-blue-50/5' : 'border-slate-300 bg-slate-100/50 hover:border-blue-400 hover:bg-white hover:shadow-2xl'}`}>
                  {thumbnail ? (
                    <img src={thumbnail.preview} className="w-full h-full object-cover rounded-[1.5rem] transition-transform duration-1000 group-hover:scale-105" alt="Preview" />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mx-auto text-slate-400 transition-all group-hover:text-blue-500 group-hover:scale-110 border border-slate-200">
                        <FiPlus className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Upload Display Banner</span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Recommended size: 1200x600</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                     <p className="text-white text-[10px] font-bold uppercase tracking-widest">Change Banner</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Service Gallery</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative group aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-100/50 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-white hover:shadow-xl transition-all overflow-hidden shrink-0">
                  <div className="flex flex-col items-center gap-2">
                    <FiPlus className="w-5 h-5 text-slate-500 group-hover:text-blue-500 group-hover:scale-125 transition-all" strokeWidth={3} />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Add</span>
                  </div>
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
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-700 rounded-full" />
            Service Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Service Name</label>
              <input 
                type="text" 
                name="serviceName"
                value={form.serviceName}
                onChange={handleChange}
                placeholder="e.g. Architectural Rendering"
                className="w-full bg-white border border-slate-300 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-semibold placeholder:text-slate-400 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 ml-1">
                Category <span className="text-blue-600">*</span>
              </label>
              <CategoryDropdown 
                categories={categories} 
                selected={form.category} 
                onSelect={(val) => setForm(prev => ({ ...prev, category: val }))}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">Service Charge (₹)</label>
              <input 
                type="number" 
                name="serviceCharge"
                value={form.serviceCharge}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-bold placeholder:text-slate-400 transition-all shadow-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2 ml-1">
                <FiInfo className="w-3.5 h-3.5" /> Service Description
              </label>
              <textarea 
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe your service details, deliverables and process..."
                rows={5}
                className="w-full bg-white border border-slate-300 rounded-[2rem] px-6 py-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-medium placeholder:text-slate-400 transition-all shadow-sm resize-none"
              ></textarea>
            </div>
          </div>
        </section>
        {/* Highlights Section */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-700 rounded-full" />
            Service Highlights
          </h2>
          
          <div className="space-y-4">
            {points.map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="flex items-center gap-2 md:gap-4 group"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 font-black text-[10px] shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                  {i + 1}
                </div>
                <input 
                  type="text" 
                  value={p}
                  onChange={(e) => handlePointChange(i, e.target.value)}
                  placeholder="Key highlight or feature..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 font-semibold placeholder:text-slate-400 transition-all shadow-sm"
                />
                {points.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePoint(i)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            ))}
            <button 
              type="button" 
              onClick={handleAddPoint}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-3"
            >
              <FiPlus strokeWidth={3} className="w-4 h-4" /> Add Highlight
            </button>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-10 pb-12">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.5)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="flex-[2] h-16 md:h-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.5em] rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {submitting ? 'ADDING SERVICE...' : <><FiCheck className="w-5 h-5" strokeWidth={3} /> ADD SERVICE</>}
          </motion.button>
          
          <button
            type="button"
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="flex-1 h-16 md:h-20 bg-rose-50/50 border-2 border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.5rem] md:rounded-[2.5rem] hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200 transition-all active:scale-[0.98]"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServiceForm
