import { useState, useEffect } from 'react'
import { getWebContainerUrl, setWebContainerUrl } from '../../../services/api'

function WebContainerSettings() {
  const [url, setUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadUrl()
  }, [])

  const loadUrl = async () => {
    setLoading(true)
    try {
      const data = await getWebContainerUrl()
      setUrl(data.url || '')
      setSavedUrl(data.url || '')
    } catch {
      setError('Failed to load current URL')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const data = await setWebContainerUrl(url.trim())
      setSavedUrl(data.url || url.trim())
      setMessage('URL saved successfully!')
      setIsEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save URL')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setUrl(savedUrl)
    setIsEditing(false)
    setError(null)
    setMessage(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Web Container Settings</h2>
        <p className="text-gray-600">Manage the URL displayed in the Bazaar User web container</p>
      </div>

      {!isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Currently Applied URL</h3>
            {savedUrl ? (
              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-lg font-medium break-all hover:text-blue-800"
              >
                {savedUrl}
              </a>
            ) : (
              <p className="text-gray-400 italic">No URL configured yet</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              This URL is displayed in the Bazaar User app web container.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Edit URL
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Web URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
                setMessage(null)
              }}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the full URL (e.g., https://example.com/page)</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : 'Save URL'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebContainerSettings
