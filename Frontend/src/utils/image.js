import { API_BASE_URL } from '../config/api'

/**
 * Dynamic URL Fixer: Replaces old IPs/hostnames with current VITE_BACKEND_URL
 */
export const fixImageUrl = (url) => {
  if (!url) return null
  if (typeof url !== 'string') return url
  if (url.startsWith('blob:')) return url
  if (url.startsWith('data:')) return null

  // Convert Google Drive "uc?export=view" URLs → embeddable thumbnail URLs
  if (url.includes('drive.google.com/uc') && url.includes('export=view')) {
    try {
      const parsed = new URL(url)
      const fileId = parsed.searchParams.get('id')
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`
      }
    } catch (_) {}
  }

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

  // Convert Google Drive "uc?export=view" URLs → embeddable thumbnail URLs
  // (uc?export=view is blocked by browsers; thumbnail API is publicly embeddable)
  if (path.includes('drive.google.com/uc') && path.includes('export=view')) {
    try {
      const url = new URL(path)
      const fileId = url.searchParams.get('id')
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`
      }
    } catch (_) {}
  }

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

/** Extract /static/... path or remote URL from a full or relative URL */
export const extractStaticPath = (url) => {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url // Support Cloudinary/Remote
  if (url.startsWith('/api/uploads/')) return url.split('?')[0]
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

/**
 * Compresses an image file and converts it to WebP format on the client side
 * @param {File} file - The original uploaded file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Compression quality (0.0 to 1.0)
 * @returns {Promise<File>} A promise that resolves to the compressed WebP File
 */
export const compressToWebP = (file, maxWidth = 256, maxHeight = 256, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // If the file is not an image, resolve with original
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions to maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              const webpFile = new File([blob], newName, {
                type: "image/webp",
                lastModified: Date.now()
              });
              resolve(webpFile);
            } else {
              // Fallback to original file on failure
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
