import { API_BASE_URL } from '../config/api'

/**
 * Dynamic URL Fixer: Replaces old IPs/hostnames with current VITE_BACKEND_URL
 */
export const fixImageUrl = (url) => {
  if (!url) return null
  if (typeof url !== 'string') return url
  if (url.startsWith('blob:')) return url
  if (url.startsWith('data:')) return null

  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (!backendUrl) return url

  try {
    if (url.startsWith('http')) {
      const urlObj = new URL(url)
      const currentBackendObj = new URL(backendUrl)

      const isLocal =
        urlObj.hostname.includes('192.168.') ||
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1'

      if (isLocal && urlObj.host !== currentBackendObj.host) {
        const pathParts = url.split('/api/uploads/')
        if (pathParts.length > 1) {
          return `${backendUrl}/api/uploads/${pathParts[1]}`
        }
        const staticParts = url.split('/static/')
        if (staticParts.length > 1) {
          return `${backendUrl}/static/${staticParts[1]}`
        }
      }
      return url
    }

    if (url.startsWith('/api/') || url.startsWith('/static/')) {
      const base = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl
      return `${base}${url}`
    }
  } catch (e) {
    console.warn('Failed to fix image URL:', e)
  }

  return url
}

export const getImageUrl = (path) => {
  if (!path) return ''
  if (typeof path !== 'string') return ''
  if (path.startsWith('data:')) return ''
  if (path.startsWith('blob:')) return path
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return fixImageUrl(path) || path
  }
  if (path.startsWith('/static/') || path.startsWith('/api/')) {
    return fixImageUrl(path) || path
  }
  return path
}

/**
 * Preferred helper for <img src> and CSS backgrounds.
 */
export const resolveImageUrl = (path) => {
  if (!path) return null
  if (typeof path !== 'string') return null
  if (path.startsWith('data:')) return null
  if (path.startsWith('blob:')) return path
  return getImageUrl(path) || fixImageUrl(path)
}

/** Extract /static/... path from a full or relative URL */
export const extractStaticPath = (url) => {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('/static/')) return url.split('?')[0]
  const match = url.match(/\/static\/[^?#]+/)
  return match ? match[0] : null
}

export const getOrderProductImage = (order) => {
  if (!order) return null
  const product = order.product || order.product_snapshot || {}
  const current = order.product_current || {}
  const candidates = [
    product.thumbnail,
    product.image,
    current.thumbnail,
    order.product_snapshot?.thumbnail,
  ]
  for (const c of candidates) {
    const resolved = resolveImageUrl(c)
    if (resolved) return resolved
  }
  return null
}
