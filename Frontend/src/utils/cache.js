/**
 * Lightweight cache utility for fast loading
 * Cache is invalidated on socket updates to ensure real-time data
 */
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.timestamps = new Map()
    this.maxAge = 5 * 60 * 1000 // 5 minutes default
    this.maxSize = 50 // Maximum cache entries
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get(key) {
    const entry = this.cache.get(key)
    const timestamp = this.timestamps.get(key)
    
    if (!entry || !timestamp) {
      return null
    }

    // Check if cache is expired
    const age = Date.now() - timestamp
    if (age > this.maxAge) {
      this.delete(key)
      return null
    }

    return entry
  }

  /**
   * Set cache entry
   */
  set(key, value, customMaxAge = null) {
    // Enforce max size - remove oldest entries if needed
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.timestamps.entries()
        .sort((a, b) => a[1] - b[1])[0]?.[0]
      if (oldestKey) {
        this.delete(oldestKey)
      }
    }

    this.cache.set(key, value)
    this.timestamps.set(key, Date.now())
    
    // Store custom max age if provided
    if (customMaxAge) {
      this.timestamps.set(`${key}_maxAge`, customMaxAge)
    }
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key)
    this.timestamps.delete(key)
    this.timestamps.delete(`${key}_maxAge`)
  }

  /**
   * Invalidate cache for a specific key or pattern
   * Used when socket updates occur
   */
  invalidate(keyOrPattern) {
    if (typeof keyOrPattern === 'string') {
      // Exact match
      if (this.cache.has(keyOrPattern)) {
        this.delete(keyOrPattern)
      }
      // Pattern match (e.g., 'orders:*')
      if (keyOrPattern.includes('*')) {
        const pattern = keyOrPattern.replace(/\*/g, '.*')
        const regex = new RegExp(`^${pattern}$`)
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.delete(key)
          }
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
    this.timestamps.clear()
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size
  }
}

// Singleton instance
const cacheManager = new CacheManager()

export default cacheManager
