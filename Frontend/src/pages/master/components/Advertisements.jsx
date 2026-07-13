import { useState, useEffect } from 'react'
import { getAdvertisements, createAdvertisement, deleteAdvertisement } from '../../../services/api'
import { FaTrash, FaPlus, FaSpinner, FaImage, FaVideo } from 'react-icons/fa'
import { getImageUrl } from '../../../utils/image'

const Advertisements = () => {
  const [advertisements, setAdvertisements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [file, setFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState('image') // 'image' or 'video'

  useEffect(() => {
    fetchAdvertisements()
  }, [])

  const fetchAdvertisements = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdvertisements()
      setAdvertisements(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch advertisements')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMediaPreview(URL.createObjectURL(selectedFile))
      
      if (selectedFile.type.startsWith('video/')) {
        setMediaType('video')
      } else {
        setMediaType('image')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a media file (image or video)')
      return
    }
    if (!link) {
      setError('Please provide a hyperlink')
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('link', link)
      formData.append('file', file)
      formData.append('media_type', mediaType)
      
      await createAdvertisement(formData)
      
      // Reset form
      setIsAdding(false)
      setTitle('')
      setLink('')
      setFile(null)
      setMediaPreview(null)
      setMediaType('image')
      
      // Refresh list
      fetchAdvertisements()
    } catch (err) {
      setError(err.message || 'Failed to create advertisement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return
    
    try {
      await deleteAdvertisement(adId)
      fetchAdvertisements()
    } catch (err) {
      setError(err.message || 'Failed to delete advertisement')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <FaSpinner className="h-8 w-8 animate-spin text-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Spotlight Advertisements</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition-colors"
          >
            <FaPlus className="h-4 w-4" />
            <span>Add Advertisement</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">New Advertisement</h3>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Advertisement Title"
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hyperlink <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Media File (Image or Video) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                required
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>

            {mediaPreview && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 max-w-md">
                {mediaType === 'video' ? (
                  <video 
                    src={mediaPreview} 
                    className="w-full h-auto" 
                    controls 
                    muted 
                  />
                ) : (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-auto object-cover" 
                  />
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setError(null)
                }}
                className="rounded-xl border border-slate-200 px-6 py-2 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Advertisement</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Advertisements */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {advertisements.length === 0 && !isAdding ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <FaImage className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No advertisements</h3>
            <p className="mt-1 text-slate-500">Get started by adding a new advertisement for the spotlight.</p>
          </div>
        ) : (
          advertisements.map((ad) => (
            <div key={ad.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col group">
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                {ad.media_type === 'video' ? (
                  <video 
                    src={getImageUrl(ad.media_url)} 
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img 
                    src={getImageUrl(ad.media_url)} 
                    alt={ad.title || 'Advertisement'} 
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <div className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-md flex items-center gap-1">
                    {ad.media_type === 'video' ? <FaVideo className="h-3 w-3"/> : <FaImage className="h-3 w-3" />}
                    <span className="capitalize">{ad.media_type}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-semibold text-slate-900 line-clamp-1">{ad.title || 'Untitled'}</h3>
                
                <a 
                  href={ad.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mt-1 text-sm text-blue-600 hover:underline line-clamp-1 truncate block"
                >
                  {ad.link}
                </a>
                
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Added: {new Date(ad.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete advertisement"
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Advertisements
