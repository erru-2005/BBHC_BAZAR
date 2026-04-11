/**
 * Image utility functions
 */

/**
 * Dynamic URL Fixer: Replaces old IPs/hostnames with current VITE_BACKEND_URL
 * This is essential for local development where backend IP can change.
 * @param {string} url - The image URL to fix
 * @returns {string} - The fixed URL or the original if no fix needed
 */
export const fixImageUrl = (url) => {
    if (!url) return null
    if (typeof url !== 'string') return url
    if (url.startsWith('blob:') || url.startsWith('data:')) return url
    
    // Get backend URL from env
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!backendUrl) return url

    try {
        // Handle full URLs
        if (url.startsWith('http')) {
            const urlObj = new URL(url)
            const currentBackendObj = new URL(backendUrl)
            
            // If it's a local address (IP) or localhost but doesn't match current backend host, update it
            const isLocal = urlObj.hostname.includes('192.168.') || 
                            urlObj.hostname === 'localhost' || 
                            urlObj.hostname === '127.0.0.1'
            
            if (isLocal && urlObj.host !== currentBackendObj.host) {
                // Find where the path starts after the host
                // Typically: http://old-ip:5000/api/uploads/filename.jpg
                // We want to replace everything before /api/ with the new backendUrl
                const pathParts = url.split('/api/uploads/')
                if (pathParts.length > 1) {
                    return `${backendUrl}/api/uploads/${pathParts[1]}`
                }
            }
        } else {
            // Handle relative paths (e.g., /api/uploads/...)
            if (url.startsWith('/api/')) {
                return `${backendUrl}${url}`
            }
        }
    } catch (e) {
        console.warn('Failed to fix image URL:', e)
    }
    
    return url
}
