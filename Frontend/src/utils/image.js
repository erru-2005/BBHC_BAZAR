import { API_BASE_URL } from '../config/api'

/**
 * Utility to get the correct URL for an image.
 * If the path starts with /static, it appends the backend base URL.
 * If it's already a full URL or a base64 string, it returns it as is.
 */
export const getImageUrl = (path) => {
  if (!path) return ''
  
  // If it's a base64 string or already a full URL
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // If it's a relative static path from our backend
  if (path.startsWith('/static/')) {
    // Ensure no double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
    return `${baseUrl}${path}`
  }
  
  return path
}
