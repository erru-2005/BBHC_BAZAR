/** Soft-cache TTLs (ms) — data is shown instantly, then refreshed when stale. */
export const CACHE_TTL = {
  master: 90 * 1000,
  seller: 90 * 1000,
  outlet: 90 * 1000,
  userHome: 5 * 60 * 1000,
  api: 30 * 1000,
}

export const isCacheStale = (timestamp, ttlMs) => {
  if (!timestamp) return true
  return Date.now() - timestamp > ttlMs
}

export const entityId = (item) => String(item?.id || item?._id || '')
