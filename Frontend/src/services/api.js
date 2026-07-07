/**
 * API Service for making HTTP requests using axios
 */
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import { setDeviceToken } from '../utils/device'
import { getSocket, initSocket } from '../utils/socket'
import { store } from '../store'
import { setToken, logout, updateUserInfo } from '../store/authSlice'
import { updateProductInCache, invalidateHomeCache } from '../store/dataSlice'
import { updateSellerOrder } from '../store/sellerSlice'
import { updateOutletOrder } from '../store/outletSlice'
import { setMastersData, updateMasterSeller } from '../store/masterSlice'

// Create axios instance
const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL
  // If it's a hardcoded IP that doesn't match current host, we might want to be careful
  // but for now, we'll trust the env if it exists, otherwise fallback to current hostname
  if (envUrl) return envUrl
  
  // Dynamic fallback: same host as frontend, but port 5001
  const host = window.location.hostname
  const protocol = window.location.protocol
  return `${protocol}//${host}:5001`
}

const API_BASE_URL = getBackendUrl()
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds global timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Simple in-memory cache for speed
const apiCache = {
  products: { data: null, timestamp: 0 },
  orders: { data: null, timestamp: 0 },
  sellerProducts: { data: null, timestamp: 0 },
  services: { data: null, timestamp: 0 }
}
const CACHE_DURATION = 30000 // 30 seconds cache
const SOCKET_RESYNC_COOLDOWN = 15000
let cacheSocketBound = false
let boundSocketRef = null
let portalSyncSocketRef = null
let lastResyncAt = 0

// Role-specific token detection for isolation
const getContextAwareToken = (requestUrl = '', method = '') => {
  const currentPath = window.location.pathname
  const httpMethod = String(method || '').toLowerCase()
  
  // 1. Check API URL first (direct intent - most reliable)
  
  // Master-specific endpoints & actions
  const isMasterEndpoint = ['/api/register_master', '/api/sellers', '/api/analytics', '/api/products/pending', '/api/services/pending', '/api/masters', '/api/auth/master', '/cancel-master'].some(ep => requestUrl.includes(ep))
  const isMasterProductWrite =
    ['post', 'put', 'delete', 'patch'].includes(httpMethod) &&
    requestUrl.includes('/api/products') &&
    !requestUrl.includes('/api/products/pending') &&
    !requestUrl.includes('/ratings')
  const isMasterAction = (requestUrl.includes('/api/products/') || requestUrl.includes('/api/services/')) && 
                         (requestUrl.includes('/approve') || requestUrl.includes('/accept') || requestUrl.includes('/reject'))
  
  if (isMasterEndpoint || isMasterAction || isMasterProductWrite) return localStorage.getItem('bbhc_master_token')
  
  // Seller-specific endpoints & actions
  const isSellerEndpoint = requestUrl.includes('/api/seller')
  const isSellerAction = requestUrl.includes('/api/orders/') && 
                         (requestUrl.includes('/accept') || requestUrl.includes('/reject'))
  const isOrderScan = requestUrl.includes('/api/orders/scan')
  
  if (isSellerEndpoint || isSellerAction) return localStorage.getItem('bbhc_seller_token')
  if (isOrderScan) return localStorage.getItem('bbhc_seller_token') || localStorage.getItem('bbhc_outlet_man_token')
  
  // Outlet-specific endpoints
  if (requestUrl.includes('/api/outlet_man')) return localStorage.getItem('bbhc_outlet_man_token')
  
  // 2. Check UI context if API URL is generic (e.g., /api/auth/me, /api/auth/refresh, /api/orders)
  if (currentPath.startsWith('/seller')) return localStorage.getItem('bbhc_seller_token')
  if (currentPath.startsWith('/outlet')) return localStorage.getItem('bbhc_outlet_man_token')
  if (currentPath.startsWith('/master')) return localStorage.getItem('bbhc_master_token')
  
  // Default to user token for consumer-facing endpoints
  return localStorage.getItem('bbhc_user_token') || localStorage.getItem('token')
}

const getContextAwareRefresh = () => {
  const currentPath = window.location.pathname
  if (currentPath.startsWith('/seller')) return localStorage.getItem('bbhc_seller_refresh_token')
  if (currentPath.startsWith('/outlet')) return localStorage.getItem('bbhc_outlet_man_refresh_token')
  if (currentPath.startsWith('/master')) return localStorage.getItem('bbhc_master_refresh_token')
  return localStorage.getItem('bbhc_user_refresh_token') || localStorage.getItem('refresh_token')
}

const setContextAwareToken = (token) => {
  const currentPath = window.location.pathname
  let key = 'bbhc_user_token'
  if (currentPath.startsWith('/seller')) key = 'bbhc_seller_token'
  else if (currentPath.startsWith('/outlet')) key = 'bbhc_outlet_man_token'
  else if (currentPath.startsWith('/master')) key = 'bbhc_master_token'
  
  localStorage.setItem(key, token)
  localStorage.setItem('token', token) // Legacy fallback
}

const nowTs = () => Date.now()

const isFresh = (cacheEntry, ttlMs = CACHE_DURATION) => (
  !!cacheEntry.data && (nowTs() - cacheEntry.timestamp < ttlMs)
)

const toEntityId = (item) => String(item?.id || item?._id || '')

const upsertEntity = (list = [], incoming) => {
  const incomingId = toEntityId(incoming)
  if (!incomingId) return list
  const idx = list.findIndex((item) => toEntityId(item) === incomingId)
  if (idx === -1) return [incoming, ...list]
  const next = [...list]
  next[idx] = { ...next[idx], ...incoming }
  return next
}

const removeEntity = (list = [], entity) => {
  const entityId = toEntityId(entity)
  if (!entityId) return list
  return list.filter((item) => toEntityId(item) !== entityId)
}

const rebuildOrdersCache = (incomingOrder) => {
  if (!apiCache.orders.data?.orders) return
  const merged = upsertEntity(apiCache.orders.data.orders, incomingOrder)
  apiCache.orders = {
    data: { ...apiCache.orders.data, orders: merged, total: Math.max(apiCache.orders.data.total || 0, merged.length) },
    timestamp: nowTs()
  }
}

const invalidateMainCaches = () => {
  apiCache.products.timestamp = 0
  apiCache.services.timestamp = 0
  apiCache.orders.timestamp = 0
  apiCache.sellerProducts.timestamp = 0
}

/** Bust in-memory API cache (call after mutations). */
export const invalidateApiCache = (keys = ['products', 'orders', 'services', 'sellerProducts']) => {
  keys.forEach((key) => {
    if (apiCache[key]) {
      apiCache[key].timestamp = 0
    }
  })
}

const resyncCachedCollectionsOnReconnect = async () => {
  const now = nowTs()
  if (now - lastResyncAt < SOCKET_RESYNC_COOLDOWN) return
  lastResyncAt = now

  try {
    if (apiCache.products.data) {
      const response = await apiClient.get(API_ENDPOINTS.API.PRODUCTS)
      apiCache.products = { data: response.products || [], timestamp: nowTs() }
    }
    if (apiCache.services.data) {
      const response = await apiClient.get(API_ENDPOINTS.API.SERVICES)
      apiCache.services = { data: response.services || [], timestamp: nowTs() }
    }
    if (apiCache.orders.data) {
      const response = await apiClient.get(API_ENDPOINTS.API.ORDERS, { params: { page: 1, limit: 10, sort: '-created_at' } })
      apiCache.orders = {
        data: {
          orders: response.orders || [],
          total: response.total || response.orders?.length || 0,
          page: response.page || 1,
          limit: response.limit || 10,
          totalPages: response.totalPages || 1
        },
        timestamp: nowTs()
      }
    }
  } catch {
    // Keep current cache on transient network failures.
  }
}

const bindRealtimeCacheSync = () => {
  const state = store.getState()
  const role = state?.auth?.userType || 'user'
  const token = getContextAwareToken()

  let socket = getSocket()
  if (!socket) {
    socket = initSocket(token, role)
  }
  if (!socket) return

  if (cacheSocketBound && boundSocketRef === socket) return

  cacheSocketBound = true
  boundSocketRef = socket

  socket.on('connect', () => {
    invalidateMainCaches()
    resyncCachedCollectionsOnReconnect()
  })

  socket.on('product_created', (product) => {
    if (!product) return
    if (apiCache.products.data) {
      apiCache.products = { data: upsertEntity(apiCache.products.data, product), timestamp: nowTs() }
    }
    if (apiCache.sellerProducts.data) {
      apiCache.sellerProducts = { data: upsertEntity(apiCache.sellerProducts.data, product), timestamp: nowTs() }
    }
    store.dispatch(updateProductInCache(product))
  })

  socket.on('product_updated', (product) => {
    if (!product) return
    if (apiCache.products.data) {
      apiCache.products = { data: upsertEntity(apiCache.products.data, product), timestamp: nowTs() }
    }
    if (apiCache.sellerProducts.data) {
      apiCache.sellerProducts = { data: upsertEntity(apiCache.sellerProducts.data, product), timestamp: nowTs() }
    }
    store.dispatch(updateProductInCache(product))
  })

  socket.on('product_deleted', (product) => {
    if (!product) return
    if (apiCache.products.data) {
      apiCache.products = { data: removeEntity(apiCache.products.data, product), timestamp: nowTs() }
    }
    if (apiCache.sellerProducts.data) {
      apiCache.sellerProducts = { data: removeEntity(apiCache.sellerProducts.data, product), timestamp: nowTs() }
    }
    const pid = String(product?.id || product?._id || product?.product_id || '')
    if (pid && apiCache.products.data) {
      store.dispatch(invalidateHomeCache())
    }
  })

  socket.on('service_created', (service) => {
    if (!service || !apiCache.services.data) return
    apiCache.services = { data: upsertEntity(apiCache.services.data, service), timestamp: nowTs() }
  })

  socket.on('service_updated', (service) => {
    if (!service || !apiCache.services.data) return
    apiCache.services = { data: upsertEntity(apiCache.services.data, service), timestamp: nowTs() }
  })

  socket.on('service_deleted', (service) => {
    if (!service || !apiCache.services.data) return
    apiCache.services = { data: removeEntity(apiCache.services.data, service), timestamp: nowTs() }
  })

  socket.on('new_order', (order) => {
    rebuildOrdersCache(order)
    if (!order) return
    const role = store.getState()?.auth?.userType
    if (role === 'seller') store.dispatch(updateSellerOrder(order))
    else if (role === 'outlet_man') store.dispatch(updateOutletOrder(order))
    else if (role === 'master') {
      const orders = store.getState().master?.orders || []
      store.dispatch(setMastersData({ field: 'orders', data: [order, ...orders.filter((o) => String(o.id) !== String(order.id))] }))
    }
  })
  socket.on('order_updated', (order) => {
    rebuildOrdersCache(order)
    if (!order) return
    const role = store.getState()?.auth?.userType
    if (role === 'seller') store.dispatch(updateSellerOrder(order))
    else if (role === 'outlet_man') store.dispatch(updateOutletOrder(order))
    else if (role === 'master') {
      const orders = store.getState().master?.orders || []
      const merged = orders.map((o) => (String(o.id) === String(order.id) ? order : o))
      store.dispatch(setMastersData({ field: 'orders', data: merged }))
    }
  })
}

const applySellerCreditsPayload = (data) => {
  if (!data || data.credits == null) return
  const auth = store.getState().auth
  const incomingId = String(data.seller_id || data.id || '')

  if (auth.userType === 'seller') {
    const myId = String(auth.user?.id || '')
    if (myId && incomingId && incomingId !== myId) return
    store.dispatch(updateUserInfo({ credits: data.credits }))
    return
  }

  if (auth.userType === 'master' && incomingId) {
    store.dispatch(updateMasterSeller({ id: incomingId, credits: data.credits }))
  }
}

const handleSellerProfileUpdated = (sellerData) => {
  if (!sellerData || sellerData.credits == null) return
  const auth = store.getState().auth
  if (auth.userType !== 'seller') return
  const myId = String(auth.user?.id || '')
  const incomingId = String(sellerData.id || sellerData._id || '')
  if (myId && incomingId && incomingId !== myId) return
  store.dispatch(updateUserInfo({ credits: sellerData.credits }))
}

/**
 * Bind portal-wide realtime sync (credits, cache invalidation on reconnect).
 * Safe to call on every connect / auth change — listeners are refreshed.
 */
export const bindPortalRealtimeSync = () => {
  const auth = store.getState()?.auth
  const role = auth?.userType || 'user'
  const token = getContextAwareToken()

  let socket = getSocket()
  if (!socket && token) {
    socket = initSocket(token, role)
  }
  if (!socket) return

  const attachListeners = () => {
    socket.off('seller_credits_updated', applySellerCreditsPayload)
    socket.off('seller_updated', handleSellerProfileUpdated)
    socket.on('seller_credits_updated', applySellerCreditsPayload)
    socket.on('seller_updated', handleSellerProfileUpdated)
  }

  if (portalSyncSocketRef && portalSyncSocketRef !== socket) {
    portalSyncSocketRef.off('connect', attachListeners)
  }

  if (portalSyncSocketRef !== socket) {
    portalSyncSocketRef = socket
    socket.on('connect', attachListeners)
  }

  attachListeners()
}

/** @deprecated Use bindPortalRealtimeSync — kept for compatibility */
export const bindSellerRealtimeSync = bindPortalRealtimeSync

const SELLER_PROFILE_STALE_MS = 60000
let lastSellerProfileSyncAt = 0

/** Soft refresh of seller credits from /auth/me (bypasses redux-persist stale balance). */
export const refreshSellerProfile = async (force = false) => {
  const state = store.getState()
  if (state?.auth?.userType !== 'seller' || !state.auth.isAuthenticated) return null

  const now = Date.now()
  if (!force && now - lastSellerProfileSyncAt < SELLER_PROFILE_STALE_MS) return null
  lastSellerProfileSyncAt = now

  try {
    const data = await getCurrentUser()
    if (data?.user?.credits != null) {
      store.dispatch(updateUserInfo({ credits: data.user.credits }))
    }
    return data?.user ?? null
  } catch {
    return null
  }
}

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    // Skip adding token if this is a refresh request (to avoid loops)
    if (config.skipAuthRefresh) {
      return config
    }
    const token = getContextAwareToken(config.url, config.method)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Add response interceptor for error handling and automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors specifically - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for refresh endpoint itself to avoid infinite loop
      if (originalRequest.url?.includes('/auth/refresh')) {
        const message = error.response?.data?.error || 'Token refresh failed. Please log in again.'
        throw new Error(message)
      }

      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getContextAwareRefresh()
      
      // If no refresh token, logout immediately
      if (!refreshToken) {
        isRefreshing = false
        processQueue(new Error('No refresh token available'), null)
        store.dispatch(logout())
        const message = error.response?.data?.error || 'Authentication failed. Please log in again.'
        throw new Error(message)
      }

      try {
        // Try to refresh the token (use axios directly to avoid interceptor loop)
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`
            }
          }
        )

        const newAccessToken = refreshResponse.data.access_token
        
        if (!newAccessToken) {
          throw new Error('No access token received from refresh endpoint')
        }
        
        // Update stored token context-aware
        setContextAwareToken(newAccessToken)
        
        // Update Redux store
        store.dispatch(setToken(newAccessToken))

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        
        isRefreshing = false
        processQueue(null, newAccessToken)

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout user
        isRefreshing = false
        processQueue(refreshError, null)
        store.dispatch(logout())
        
        const message = refreshError.response?.data?.error || refreshError.message || 'Session expired. Please log in again.'
        throw new Error(message)
      }
    }

    // For non-401 errors or if retry already attempted, throw normally
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed'
    
    // Skip logging CORS/network errors for analytics endpoints (they're handled gracefully with fallback)
    const isAnalyticsEndpoint = originalRequest?.url?.includes('/api/analytics/')
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('CORS')
    
    if (!(isAnalyticsEndpoint && isNetworkError)) {
    console.error('API Error:', error.response?.data || error.message)
    }
    
    throw new Error(message)
  }
)

/**
 * Master login - Step 1: Validate credentials and get OTP session
 * @param {string} username - Master username
 * @param {string} password - Master password
 * @param {string} deviceId - Device ID (optional)
 * @param {string} deviceToken - Device token (optional)
 * @returns {Promise} Login response with OTP session ID or JWT tokens if device token valid
 */
export const masterLogin = async (username, password, deviceId = null, deviceToken = null) => {
  try {
    const requestData = {
      username,
      password,
    }
    
    if (deviceId) {
      requestData.device_id = deviceId
    }
    if (deviceToken) {
      requestData.device_token = deviceToken
    }
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.MASTER_LOGIN, requestData)

    // Check if we have access_token (means skip_otp is true)
    const hasAccessToken = !!(response.access_token)
    const skipOtp = response.skip_otp === true || response.skip_otp === 'true' || hasAccessToken

    return {
      otp_session_id: response.otp_session_id,
      otp: response.otp, // Only for development (if present)
      message: response.message,
      phone_number: response.phone_number, // Masked phone number (last 4 digits)
      email_masked: response.email_masked,
      user: response.user, // User data
      skip_otp: skipOtp, // True if device token was valid or access_token is present
      access_token: response.access_token, // JWT token if skip_otp is true
      refresh_token: response.refresh_token, // Refresh token if skip_otp is true
      userType: response.userType || 'master', // User type if skip_otp is true
      device_token: response.device_token, // Device token if returned (for device_id-only login)
    }
  } catch (error) {
    throw new Error(error.message || 'Login failed')
  }
}

/**
 * Request master OTP without password (forgot password flow)
 * @param {string} username - Master username
 * @returns {Promise} OTP session info
 */
export const requestMasterForgotPasswordOtp = async (username) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.MASTER_FORGOT_PASSWORD, { username })
    return {
      otp_session_id: response.otp_session_id,
      message: response.message,
      phone_number: response.phone_number,
      email_masked: response.email_masked,
      user: response.user,
      skip_otp: false,
    }
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to send OTP'
    throw new Error(message)
  }
}

/**
 * Reset master password via current password or OTP
 */
export const resetMasterPassword = async ({
  username,
  currentPassword,
  otpSessionId,
  otp,
  newPassword,
  confirmPassword
}) => {
  try {
    const payload = {
      username,
      new_password: newPassword,
      confirm_password: confirmPassword
    }

    if (currentPassword) {
      payload.current_password = currentPassword
    }

    if (otpSessionId && otp) {
      payload.otp_session_id = otpSessionId
      payload.otp = otp
    }

    const response = await apiClient.post(API_ENDPOINTS.AUTH.MASTER_RESET_PASSWORD, payload)
    return response?.message || 'Password updated successfully'
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to reset password'
    throw new Error(message)
  }
}

/**
 * Outlet man login - Step 1: Validate credentials and get OTP session
 * @param {string} outlet_access_code - Outlet man access code
 * @param {string} password - Outlet man password
 * @param {string} deviceId - Device ID (optional)
 * @param {string} deviceToken - Device token (optional)
 * @returns {Promise} Login response with OTP session ID or JWT tokens if device token valid
 */
export const outletManLogin = async (outlet_access_code, password, deviceId = null, deviceToken = null) => {
  try {
    const requestData = {
      outlet_access_code,
      password,
    }
    
    if (deviceId) {
      requestData.device_id = deviceId
    }
    if (deviceToken) {
      requestData.device_token = deviceToken
    }
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.OUTLET_MAN_LOGIN, requestData)

    // Check if we have access_token (means skip_otp is true)
    const hasAccessToken = !!(response.access_token)
    const skipOtp = response.skip_otp === true || response.skip_otp === 'true' || hasAccessToken

    return {
      otp_session_id: response.otp_session_id,
      otp: response.otp, // Only for development (if present)
      message: response.message,
      phone_number: response.phone_number, // Masked phone number (last 4 digits)
      user: response.user, // User data
      skip_otp: skipOtp, // True if device token was valid or access_token is present
      access_token: response.access_token, // JWT token if skip_otp is true
      refresh_token: response.refresh_token, // Refresh token if skip_otp is true
      userType: response.userType || 'outlet_man', // User type if skip_otp is true
      device_token: response.device_token, // Device token if returned (for device_id-only login)
    }
  } catch (error) {
    throw new Error(error.message || 'Login failed')
  }
}

/**
 * Seller login - Step 1: Validate credentials and get OTP session
 * @param {string} trade_id - Seller Trade ID
 * @param {string} password - Seller password
 * @param {string} deviceId - Device ID (optional)
 * @param {string} deviceToken - Device token (optional)
 * @returns {Promise} Login response with OTP session ID or JWT tokens if device token valid
 */
export const sellerLogin = async (trade_id, password, deviceId = null, deviceToken = null) => {
  try {
    const requestData = {
      trade_id,
      password,
    }
    
    if (deviceId) {
      requestData.device_id = deviceId
    }
    if (deviceToken) {
      requestData.device_token = deviceToken
    }
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SELLER_LOGIN, requestData)

    // Check if we have access_token (means skip_otp is true)
    const hasAccessToken = !!(response.access_token)
    const skipOtp = response.skip_otp === true || response.skip_otp === 'true' || hasAccessToken

    return {
      otp_session_id: response.otp_session_id,
      otp: response.otp, // Only for development (if present)
      message: response.message,
      phone_number: response.phone_number, // Masked phone number (last 4 digits) or null
      email_masked: response.email_masked,
      user: response.user, // User data
      skip_otp: skipOtp, // True if device token was valid or access_token is present
      access_token: response.access_token, // JWT token if skip_otp is true
      refresh_token: response.refresh_token, // Refresh token if skip_otp is true
      userType: response.userType || 'seller', // User type if skip_otp is true
      device_token: response.device_token, // Device token if returned (for device_id-only login)
    }
  } catch (error) {
    throw new Error(error.message || 'Login failed')
  }
}

/**
 * Request seller OTP without password (forgot password flow)
 * @param {string} trade_id - Seller trade ID
 * @returns {Promise} OTP session info
 */
export const requestSellerForgotPasswordOtp = async (trade_id) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SELLER_FORGOT_PASSWORD, { trade_id })
    return {
      otp_session_id: response.otp_session_id,
      message: response.message,
      phone_number: response.phone_number,
      email_masked: response.email_masked,
      user: response.user,
      skip_otp: false,
    }
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to send OTP'
    throw new Error(message)
  }
}

/**
 * Reset seller password via current password or OTP
 */
export const resetSellerPassword = async ({
  tradeId,
  currentPassword,
  otpSessionId,
  otp,
  newPassword,
  confirmPassword
}) => {
  try {
    const payload = {
      trade_id: tradeId,
      new_password: newPassword,
      confirm_password: confirmPassword
    }

    if (currentPassword) {
      payload.current_password = currentPassword
    }

    if (otpSessionId && otp) {
      payload.otp_session_id = otpSessionId
      payload.otp = otp
    }

    const response = await apiClient.post(API_ENDPOINTS.AUTH.SELLER_RESET_PASSWORD, payload)
    return response?.message || 'Password updated successfully'
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to reset password'
    throw new Error(message)
  }
}

/**
 * Verify OTP - Step 2: Verify OTP and get JWT tokens
 * @param {string} otp_session_id - OTP session ID from login
 * @param {string} otp - OTP code
 * @returns {Promise} Response with access token, refresh token, and user data
 */
export const verifyOTP = async (otp_session_id, otp, deviceId = null) => {
  try {
    const requestData = {
      otp_session_id,
      otp,
    }
    
    if (deviceId) {
      requestData.device_id = deviceId
    }
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, requestData)

    // Store device token if provided (tokens are stored by Redux loginSuccess)
    if (response.device_token && response.device_id && response.userType) {
      setDeviceToken(response.device_token, response.device_id, response.userType)
    }

    return {
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
      userType: response.userType,
      device_token: response.device_token,
      device_id: response.device_id,
    }
  } catch (error) {
    throw new Error(error.message || 'OTP verification failed')
  }
}

/**
 * Register master
 * @param {object} masterData - Master registration data
 * @returns {Promise} Registration response
 */
export const registerMaster = async (masterData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.REGISTER_MASTER, masterData)

    return {
      message: response.message,
      master: response.master
    }
  } catch (error) {
    throw new Error(error.message || 'Master registration failed')
  }
}

/**
 * Register seller
 * @param {object} sellerData - Seller registration data
 * @returns {Promise} Registration response
 */
export const registerSeller = async (sellerData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.REGISTER_SELLER, sellerData)

    return {
      message: response.message,
      seller: response.seller
    }
  } catch (error) {
    throw new Error(error.message || 'Seller registration failed')
  }
}

/**
 * Register outlet man
 * @param {object} outletManData - Outlet man registration data
 * @returns {Promise} Registration response
 */
export const registerOutletMan = async (outletManData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.REGISTER_OUTLET_MAN, outletManData)

    return {
      message: response.message,
      outlet_man: response.outlet_man
    }
  } catch (error) {
    throw new Error(error.message || 'Outlet man registration failed')
  }
}

/**
 * Register user (legacy - kept for backward compatibility)
 * @param {object} userData - User registration data
 * @returns {Promise} Registration response
 */
export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData)

    return {
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
    }
  } catch (error) {
    throw new Error(error.message || 'Registration failed')
  }
}

/**
 * Get current user
 * @returns {Promise} Current user data
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME)

    return {
      user: response.user,
      userType: response.userType
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to get user')
  }
}

/**
 * Send OTP to user phone number
 * @param {string} phoneNumber - Phone number
 * @returns {Promise} Response with OTP session ID
 */
export const sendUserOTP = async (email) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.USER_SEND_OTP, {
      email: email
    })

    return {
      otp_session_id: response.otp_session_id,
      email_masked: response.email_masked,
      user_exists: response.user_exists,
      message: response.message,
      otp: response.otp // Only in debug mode
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to send OTP')
  }
}

/**
 * Verify OTP for user phone login/registration
 * @param {string} otpSessionId - OTP session ID
 * @param {string} otp - OTP code
 * @returns {Promise} Response with user data if exists, or registration info if not
 */
export const verifyUserOTP = async (otpSessionId, otp) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.USER_VERIFY_OTP, {
      otp_session_id: otpSessionId,
      otp: otp
    })

    return {
      user_exists: response.user_exists,
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
      userType: response.userType || 'user',
      phone_number: response.phone_number,
      email: response.email,
      email_masked: response.email_masked,
      message: response.message
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'OTP verification failed')
  }
}

/**
 * Register new user after OTP verification
 * @param {object} userData - User registration data
 * @returns {Promise} Registration response
 */
export const registerUserPhone = async (userData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.USER_REGISTER, userData)

    return {
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
      userType: response.userType || 'user',
      message: response.message
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Registration failed')
  }
}

/**
 * Get authenticated user's profile
 * @returns {Promise} User profile data
 */
export const getUserProfile = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.USER_PROFILE)
    return response.user
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch profile')
  }
}

/**
 * Update authenticated user's profile
 * @param {object} profileData - Fields to update
 * @returns {Promise} Updated user data
 */
export const updateUserProfile = async (profileData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.AUTH.USER_PROFILE, profileData)
    return {
      user: response.user,
      message: response.message
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to update profile')
  }
}

/**
 * Get all sellers
 * @returns {Promise} List of sellers
 */
export const getSellers = async (params = {}) => {
  try {
    // Backend expects skip and limit. Map page to skip.
    const limit = params.limit || 100
    const page = params.page || 1
    const skip = params.skip !== undefined ? params.skip : (page - 1) * limit

    const queryParams = {
      skip,
      limit,
      ...params
    }
    // Remove page from queryParams as backend uses skip
    delete queryParams.page

    const response = await apiClient.get(API_ENDPOINTS.API.GET_SELLERS, { params: queryParams })
    
    // response is from backend: { sellers: [...], count: ... }
    const sellers = response.sellers || []
    const count = response.count || sellers.length

    return {
      sellers,
      total: count,
      page: page,
      limit: limit,
      totalPages: Math.ceil(count / limit)
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to get sellers')
  }
}

/**
 * Add credits to a seller
 * @param {string} sellerId
 * @param {number} amount
 * @returns {Promise} Update response
 */
export const initiateSellerCreditOtp = async (sellerId, amount, passkey) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.ADD_CREDITS_INITIATE(sellerId), {
      amount,
      passkey,
    })
  } catch (error) {
    throw new Error(error.message || 'Failed to send credit OTP')
  }
}

export const confirmSellerCredits = async (sellerId, payload) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.ADD_CREDITS_CONFIRM(sellerId), payload)
  } catch (error) {
    throw new Error(error.message || 'Failed to add credits')
  }
}

export const getSellerWalletTransactions = async (sellerId, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString()
    const url = API_ENDPOINTS.API.SELLER_WALLET_TRANSACTIONS(sellerId)
    return await apiClient.get(query ? `${url}?${query}` : url)
  } catch (error) {
    throw new Error(error.message || 'Failed to load wallet transactions')
  }
}

/** Master-only: seller wallet page data (profile, stats, transactions). */
export const getSellerWalletOverview = async (sellerId, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString()
    const url = API_ENDPOINTS.API.SELLER_WALLET_OVERVIEW(sellerId)
    return await apiClient.get(query ? `${url}?${query}` : url)
  } catch (error) {
    throw new Error(error.message || 'Failed to load seller wallet overview')
  }
}

export const getMyWalletTransactions = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString()
    const url = API_ENDPOINTS.API.SELLER_OWN_WALLET_TRANSACTIONS
    return await apiClient.get(query ? `${url}?${query}` : url)
  } catch (error) {
    throw new Error(error.message || 'Failed to load wallet transactions')
  }
}

/**
 * Create Razorpay order for seller wallet recharge
 */
export const createRazorpayRechargeOrder = async (amount) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.RAZORPAY_CREATE_ORDER, { amount })
  } catch (error) {
    throw new Error(error.message || 'Failed to start payment')
  }
}

/**
 * Verify Razorpay payment and credit wallet
 */
export const verifyRazorpayRechargePayment = async (paymentData) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.RAZORPAY_VERIFY, paymentData)
  } catch (error) {
    throw new Error(error.message || 'Payment verification failed')
  }
}

/**
 * Get all outlet men
 * @returns {Promise} List of outlet men
 */
export const getOutletMen = async (params = {}) => {
  try {
    // Support pagination: page, limit, sort (default: recent first)
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      sort: params.sort || '-created_at', // Default: newest first
      ...params
    }
    const response = await apiClient.get(API_ENDPOINTS.API.GET_OUTLET_MEN, { params: queryParams })
    return {
      outlet_men: response.outlet_men || [],
      total: response.total || response.outlet_men?.length || 0,
      page: response.page || queryParams.page,
      limit: response.limit || queryParams.limit,
      totalPages: response.totalPages || Math.ceil((response.total || response.outlet_men?.length || 0) / queryParams.limit)
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to get outlet men')
  }
}

/**
 * Get all masters
 * @returns {Promise} List of masters
 */
export const getMasters = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.GET_MASTERS)
    return response.masters || []
  } catch (error) {
    throw new Error(error.message || 'Failed to get masters')
  }
}

/**
 * Get blacklisted sellers
 * @returns {Promise<Array>} Blacklisted sellers
 */
export const getBlacklistedSellers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.GET_BLACKLISTED_SELLERS)
    return response.blacklisted_sellers || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load blacklisted sellers')
  }
}

/**
 * Unblacklist seller
 * @param {string} sellerId
 * @returns {Promise<string>} success message
 */
export const unblacklistSeller = async (sellerId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.BLACKLIST_SELLER(sellerId))
    return response.message || 'Seller removed from blacklist'
  } catch (error) {
    throw new Error(error.message || 'Failed to remove seller from blacklist')
  }
}

/**
 * Create a product
 * @param {object} productData - Product payload
 * @returns {Promise} Created product response
 */
export const createProduct = async (productData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.PRODUCTS, productData)
    return {
      message: response.message,
      product: response.product
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to create product')
  }
}

/**
 * Get all products
 * @returns {Promise<Array>} List of products
 */
export const getProducts = async (_params = {}, options = {}) => {
  bindRealtimeCacheSync()
  if (!options.forceRefresh && isFresh(apiCache.products)) {
    return apiCache.products.data
  }

  try {
    const response = await apiClient.get(API_ENDPOINTS.API.PRODUCTS)
    const products = response.products || []
    apiCache.products = { data: products, timestamp: nowTs() }
    return products
  } catch (error) {
    if (apiCache.products.data) {
      return apiCache.products.data
    }
    throw new Error(error.message || 'Failed to load products')
  }
}

/**
 * Get products belonging to the current seller
 * @returns {Promise<Array>} List of seller's products
 */
export const getSellerMyProducts = async (_params = {}, options = {}) => {
  bindRealtimeCacheSync()
  if (!options.forceRefresh && isFresh(apiCache.sellerProducts)) {
    return apiCache.sellerProducts.data
  }

  try {
    const response = await apiClient.get(API_ENDPOINTS.API.SELLER_MY_PRODUCTS)
    const products = response.products || []
    apiCache.sellerProducts = { data: products, timestamp: nowTs() }
    return products
  } catch (error) {
    if (apiCache.sellerProducts.data) {
      return apiCache.sellerProducts.data
    }
    throw new Error(error.message || 'Failed to load your products')
  }
}

/**
 * Get a single product by ID
 * @param {string} productId
 * @returns {Promise<object>} Product object
 */
export const getProductById = async (productId) => {
  if (!productId) {
    throw new Error('Product ID is required')
  }

  try {
    // Optimized: Fetch specific product instead of all products
    const response = await apiClient.get(`${API_ENDPOINTS.API.PRODUCTS}/${productId}`)
    return response.product || response
  } catch (error) {
    // Fallback if specific GET fails, try list fetch (legacy behavior but limited)
    try {
      const products = await getProducts()
      const match = products.find(
        (prod) => String(prod.id || prod._id) === String(productId)
      )
      if (match) return match
    } catch (e) {
      // ignore fallback error
    }
    throw new Error(error.message || 'Failed to load product')
  }
}

/**
 * Update a product
 * @param {string} productId
 * @param {object} productData
 * @returns {Promise<object>} Updated product
 */
export const updateProduct = async (productId, productData) => {
  try {
    const response = await apiClient.put(`${API_ENDPOINTS.API.PRODUCTS}/${productId}`, productData)
    return response.product
  } catch (error) {
    throw new Error(error.message || 'Failed to update product')
  }
}

export const createSellerProduct = async (productData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.SELLER_PRODUCTS, productData)
    return response.product
  } catch (error) {
    throw new Error(error.message || 'Failed to create product')
  }
}

export const updateSellerProduct = async (productId, productData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.SELLER_PRODUCT(productId), productData)
    return response.product
  } catch (error) {
    throw new Error(error.message || 'Failed to update product')
  }
}

/**
 * Delete a product
 * @param {string} productId
 * @returns {Promise<string>} Success message
 */
export const deleteProduct = async (productId) => {
  try {
    const response = await apiClient.delete(`${API_ENDPOINTS.API.PRODUCTS}/${productId}`)
    return response.message || 'Product deleted successfully'
  } catch (error) {
    throw new Error(error.message || 'Failed to delete product')
  }
}

/**
 * Categories
 */
export const getCategories = async (type = 'product') => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.API.CATEGORIES}?type=${encodeURIComponent(type)}`)
    return response.categories || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load categories')
  }
}

export const createCategory = async (name, type = 'product') => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.CATEGORIES, { name, type })
    return response.category
  } catch (error) {
    throw new Error(error.message || 'Failed to create category')
  }
}

/**
 * Commission Management
 */
export const applyCommissionToAll = async (commissionRate) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.COMMISSION_APPLY_ALL, {
      commission_rate: commissionRate
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to apply commission')
  }
}

export const applyCommissionByCategory = async (category, commissionRate) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.COMMISSION_APPLY_CATEGORY, {
      category,
      commission_rate: commissionRate
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to apply commission')
  }
}

export const applyCommissionToProduct = async (productId, commissionRate) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.COMMISSION_APPLY_PRODUCT, {
      product_id: productId,
      commission_rate: commissionRate
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to apply commission')
  }
}

export const getCategoryCommissionRates = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.COMMISSION_CATEGORY_RATES)
    return response.category_commissions || {}
  } catch (error) {
    throw new Error(error.message || 'Failed to get category commission rates')
  }
}

export const applyServiceCommissionToAll = async (commissionRate) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.COMMISSION_SERVICE_APPLY_ALL, {
      commission_rate: commissionRate,
    })
  } catch (error) {
    throw new Error(error.message || 'Failed to apply service commission')
  }
}

export const applyServiceCommissionByCategory = async (category, commissionRate) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.COMMISSION_SERVICE_APPLY_CATEGORY, {
      category,
      commission_rate: commissionRate,
    })
  } catch (error) {
    throw new Error(error.message || 'Failed to apply service commission')
  }
}

export const applyCommissionToService = async (serviceId, commissionRate) => {
  try {
    return await apiClient.post(API_ENDPOINTS.API.COMMISSION_SERVICE_APPLY_SERVICE, {
      service_id: serviceId,
      commission_rate: commissionRate,
    })
  } catch (error) {
    throw new Error(error.message || 'Failed to apply service commission')
  }
}

export const getServiceCategoryCommissionRates = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.COMMISSION_SERVICE_CATEGORY_RATES)
    return response.category_commissions || {}
  } catch (error) {
    throw new Error(error.message || 'Failed to get service category commission rates')
  }
}

let serviceAcceptCreditCache = { value: 25, timestamp: 0, key: 'default' }

export const getServiceAcceptCredit = async (forceRefresh = false, category = null) => {
  const cacheKey = category ? `cat:${category}` : 'default'
  const now = Date.now()
  if (
    !forceRefresh &&
    serviceAcceptCreditCache.key === cacheKey &&
    now - serviceAcceptCreditCache.timestamp < 60000
  ) {
    return serviceAcceptCreditCache.value
  }
  try {
    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    const response = await apiClient.get(
      `${API_ENDPOINTS.API.COMMISSION_SERVICE_ACCEPT_CREDIT}${params}`
    )
    const value = Number(response.credit_count ?? 25)
    serviceAcceptCreditCache = { value, timestamp: now, key: cacheKey }
    return value
  } catch {
    return serviceAcceptCreditCache.value || 25
  }
}

export const getServiceCategoryAcceptCredits = async () => {
  try {
    const response = await apiClient.get(
      API_ENDPOINTS.API.COMMISSION_SERVICE_CATEGORY_ACCEPT_CREDITS
    )
    return {
      categoryCredits: response.category_credits || {},
      defaultCredit: Number(response.default_credit ?? 25),
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to load service category credits')
  }
}

export const saveServiceCategoryAcceptCredits = async (categoryCredits) => {
  try {
    const response = await apiClient.put(
      API_ENDPOINTS.API.COMMISSION_SERVICE_CATEGORY_ACCEPT_CREDITS,
      { category_credits: categoryCredits }
    )
    invalidateServiceAcceptCreditCache()
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to save service category credits')
  }
}

export const setServiceAcceptCredit = async (creditCount) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.COMMISSION_SERVICE_ACCEPT_CREDIT, {
      credit_count: creditCount,
    })
    serviceAcceptCreditCache = { value: Number(response.credit_count), timestamp: Date.now() }
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to update service accept credit')
  }
}

export const invalidateServiceAcceptCreditCache = () => {
  serviceAcceptCreditCache.timestamp = 0
  serviceAcceptCreditCache.key = ''
}

/**
 * Get pending products (masters only)
 */
export const getPendingProducts = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.PENDING_PRODUCTS)
    return response.products || []
  } catch (error) {
    throw new Error(error.message || 'Failed to get pending products')
  }
}

/**
 * Approve a pending product (masters only)
 */
export const approveProduct = async (productId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.APPROVE_PRODUCT(productId), {})
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to approve product')
  }
}

/**
 * Reject a pending product (masters only)
 */
export const rejectProduct = async (productId, moveToBin = true) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.REJECT_PRODUCT(productId), {
      move_to_bin: moveToBin
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to reject product')
  }
}

/**
 * Update a seller
 * @param {string} sellerId - Seller ID
 * @param {object} sellerData - Seller data to update
 * @returns {Promise} Updated seller
 */
export const updateSeller = async (sellerId, sellerData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.UPDATE_SELLER(sellerId), sellerData)
    return response.seller
  } catch (error) {

    throw new Error(error.message || 'Failed to update seller')
  }
}

/**
 * Handle file upload
 * @param {File} file - File object to upload
 * @returns {Promise} Upload response with URL
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // Explicitly set content-type to multipart/form-data
    const response = await apiClient.post(`${API_BASE_URL}/api/upload`, formData, {
      timeout: 120000, // 2 minutes for uploads
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    return response
  } catch (error) {
    throw new Error(error.message || 'File upload failed')
  }
}

/** Reserve folder id before uploading product/service images */
export const reserveImageEntityId = async (entityType = 'products') => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/api/images/reserve-id`, { entity_type: entityType })
    return response.entity_id
  } catch (error) {
    throw new Error(error.message || 'Failed to reserve image folder')
  }
}

/** Upload image as WebP under /static/{entityType}/{entityId}/ */
export const uploadEntityImage = async (file, { entityType = 'products', entityId, index = 0 }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)
    formData.append('entity_id', entityId)
    formData.append('index', String(index))
    const response = await apiClient.post(`${API_BASE_URL}/api/images/upload`, formData, {
      timeout: 120000,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Image upload failed')
  }
}

/** Seller/user avatar → /static/avatars/{userId}/avatar.webp */
export const uploadAvatar = async (file, userId) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'avatars')
    formData.append('entity_id', userId)
    const response = await apiClient.post(`${API_BASE_URL}/api/images/upload`, formData, {
      timeout: 120000,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  } catch (error) {
    throw new Error(error.message || 'Avatar upload failed')
  }
}

/**
 * Update current seller's profile
 * @param {string} sellerId - Seller ID
 * @param {object} profileData - Profile data to update
 * @returns {Promise} Updated seller
 */
export const updateSellerProfile = async (sellerId, profileData) => {
  try {
    const response = await apiClient.put(`${API_BASE_URL}/api/sellers/${sellerId}`, profileData)
    return response.seller
  } catch (error) {
    throw new Error(error.message || 'Failed to update profile')
  }
}

/**
 * Blacklist a seller
 * @param {string} sellerId - Seller ID
 * @param {string} reason - Reason for blacklisting (optional)
 * @returns {Promise} Blacklist entry
 */
export const blacklistSeller = async (sellerId, reason = 'Blacklisted by master') => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.BLACKLIST_SELLER(sellerId), { reason })
    return response.blacklist
  } catch (error) {
    throw new Error(error.message || 'Failed to blacklist seller')
  }
}

/**
 * Update outlet man
 * @param {string} outletManId
 * @param {object} outletManData
 * @returns {Promise} Updated outlet man
 */
export const updateOutletMan = async (outletManId, outletManData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.UPDATE_OUTLET_MAN(outletManId), outletManData)
    return response.outlet_man
  } catch (error) {
    throw new Error(error.message || 'Failed to update outlet man')
  }
}

/**
 * Blacklist outlet man
 * @param {string} outletManId
 * @param {string} reason
 * @returns {Promise<string>} success message
 */
export const blacklistOutletMan = async (outletManId, reason = 'Blacklisted by master') => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.BLACKLIST_OUTLET_MAN(outletManId), { reason })
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to blacklist outlet man')
  }
}

/**
 * Unblacklist outlet man
 * @param {string} outletManId
 * @returns {Promise<string>} success message
 */
export const unblacklistOutletMan = async (outletManId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.UNBLACKLIST_OUTLET_MAN(outletManId))
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to unblacklist outlet man')
  }
}

/**
 * Get blacklisted outlet men
 * @returns {Promise<Array>} Blacklisted outlet men
 */
export const getBlacklistedOutletMen = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.GET_BLACKLISTED_OUTLET_MEN)
    return response.blacklisted_outlet_men || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load blacklisted outlet men')
  }
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise} New access token
 */
export const refreshToken = async (refreshToken) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {}, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    return response.access_token
  } catch (error) {
    throw new Error(error.message || 'Token refresh failed')
  }
}

/**
 * Create or update a product rating
 * @param {string} productId - Product ID
 * @param {number} rating - Rating value (1-5)
 * @param {string} reviewText - Optional review text
 * @returns {Promise} Rating object
 */
export const createOrUpdateRating = async (productId, rating, reviewText = null) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.PRODUCT_RATINGS(productId), {
      rating,
      review_text: reviewText
    })
    return response.rating
  } catch (error) {
    throw new Error(error.message || 'Failed to save rating')
  }
}

/**
 * Get current user's rating for a product
 * @param {string} productId - Product ID
 * @returns {Promise} Rating object or null
 */
export const getMyRating = async (productId) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.MY_RATING(productId))
    return response.rating
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch rating')
  }
}

/**
 * Get all ratings for a product
 * @param {string} productId - Product ID
 * @param {number} limit - Limit results
 * @param {number} skip - Skip results
 * @returns {Promise} Array of ratings
 */
export const getProductRatings = async (productId, limit = null, skip = 0) => {
  try {
    const params = { skip }
    if (limit) params.limit = limit
    
    const response = await apiClient.get(API_ENDPOINTS.API.PRODUCT_RATINGS(productId), { params })
    return response.ratings
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch ratings')
  }
}

/**
 * Get rating statistics for a product
 * @param {string} productId - Product ID
 * @returns {Promise} Rating statistics
 */
export const getProductRatingStats = async (productId) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.PRODUCT_RATING_STATS(productId))
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch rating stats')
  }
}

/**
 * Get rating statistics for a seller
 * @param {string} sellerId - Seller ID
 * @returns {Promise} Rating statistics
 */
export const getSellerRatingStats = async (sellerId) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.SELLER_RATING_STATS(sellerId))
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch seller rating stats')
  }
}

/**
 * Get products by rating category
 * @param {string} category - Rating category (1_star, 2_star, 3_star, 4_star, 5_star)
 * @param {number} limit - Limit results
 * @param {number} skip - Skip results
 * @returns {Promise} Array of product IDs
 */
export const getProductsByRatingCategory = async (category, limit = 20, skip = 0) => {
  try {
    const params = { limit, skip }
    const response = await apiClient.get(API_ENDPOINTS.API.RATING_CATEGORY(category), { params })
    return response.product_ids
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch products')
  }
}

/**
 * Delete a rating
 * @param {string} ratingId - Rating ID
 * @returns {Promise} Success message
 */
export const deleteRating = async (ratingId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.DELETE_RATING(ratingId))
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to delete rating')
  }
}

/**
 * Wishlist API
 */
export const getWishlist = async (limit = 50, skip = 0) => {
  try {
    const params = { limit, skip }
    const response = await apiClient.get(API_ENDPOINTS.API.WISHLIST, { params })
    return response.items || []
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch wishlist')
  }
}

export const addToWishlist = async (productId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.WISHLIST, {
      product_id: productId
    })
    return response.item
  } catch (error) {
    throw new Error(error.message || 'Failed to add to wishlist')
  }
}

export const removeFromWishlist = async (productId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.WISHLIST_ITEM(productId))
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to remove from wishlist')
  }
}

/**
 * Orders API
 */
export const createOrder = async (orderPayload) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDERS, orderPayload)
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to place order')
  }
}

export const getOrders = async (params = {}, options = {}) => {
  bindRealtimeCacheSync()
  try {
    // Support pagination: page, limit, sort
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      sort: params.sort || '-created_at', // Default: newest first
      ...params
    }
    // For default dashboard query, prefer warm cache first.
    const isDefaultQuery = queryParams.page === 1 && queryParams.limit === 10 && queryParams.sort === '-created_at'
    if (!options.forceRefresh && isDefaultQuery && isFresh(apiCache.orders)) {
      return apiCache.orders.data
    }

    const response = await apiClient.get(API_ENDPOINTS.API.ORDERS, { params: queryParams })
    const result = {
      orders: response.orders || [],
      total: response.total || response.orders?.length || 0,
      page: response.page || queryParams.page,
      limit: response.limit || queryParams.limit,
      totalPages: response.totalPages || Math.ceil((response.total || response.orders?.length || 0) / queryParams.limit)
    }
    
    // Cache only the first page with default limit
    if (queryParams.page === 1 && queryParams.limit === 10) {
      apiCache.orders = { data: result, timestamp: nowTs() }
    }
    
    return result
  } catch (error) {
    if (apiCache.orders.data && params.page === 1) {
      return apiCache.orders.data
    }
    throw new Error(error.message || 'Failed to fetch orders')
  }
}

export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.ORDER_STATUS(orderId), { status })
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to update order status')
  }
}

/**
 * --- SERVICE API FUNCTIONS ---
 */

/**
 * Create a service (masters only)
 */
export const createService = async (serviceData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.SERVICES, serviceData)
    return {
      message: response.message,
      service: response.service
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to create service')
  }
}

/**
 * Get all approved services (public)
 */
export const getServices = async (params = {}, options = {}) => {
  bindRealtimeCacheSync()
  try {
    const isDefaultServiceQuery = Object.keys(params).length === 0
    if (!options.forceRefresh && isDefaultServiceQuery && isFresh(apiCache.services)) {
      return apiCache.services.data
    }

    const response = await apiClient.get(API_ENDPOINTS.API.SERVICES, { params })
    const services = response.services || []
    if (isDefaultServiceQuery) {
      apiCache.services = { data: services, timestamp: nowTs() }
    }
    return services
  } catch (error) {
    if (apiCache.services.data) {
      return apiCache.services.data
    }
    throw new Error(error.message || 'Failed to load services')
  }
}

/**
 * Get service details by ID (public)
 */
export const getServiceById = async (serviceId) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.SERVICES + `/${serviceId}`)
    return response.service
  } catch (error) {
    throw new Error(error.message || 'Failed to load service details')
  }
}

/**
 * Get services pending approval (masters only)
 */
export const getPendingServices = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.PENDING_SERVICES)
    return response.services || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load pending services')
  }
}

/**
 * Approve a service (masters only)
 */
export const acceptService = async (serviceId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.APPROVE_SERVICE(serviceId), {})
    return response.message || 'Service approved'
  } catch (error) {
    throw new Error(error.message || 'Failed to approve service')
  }
}

/**
 * Reject a service (masters only)
 */
export const rejectService = async (serviceId, reason = '') => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.REJECT_SERVICE(serviceId), { reason })
    return response.message || 'Service rejected'
  } catch (error) {
    throw new Error(error.message || 'Failed to reject service')
  }
}

/**
 * Update a service (masters only)
 */
export const updateService = async (serviceId, serviceData) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.SERVICES + `/${serviceId}`, serviceData)
    return response.service
  } catch (error) {
    throw new Error(error.message || 'Failed to update service')
  }
}

/**
 * Delete a service (masters only)
 */
export const deleteService = async (serviceId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.SERVICES + `/${serviceId}`)
    return response.message || 'Service deleted successfully'
  } catch (error) {
    throw new Error(error.message || 'Failed to delete service')
  }
}

/**
 * Seller creates a service for approval
 */
export const createSellerService = async (serviceData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.SELLER_SERVICES, serviceData)
    return {
      message: response.message,
      service: response.service
    }
  } catch (error) {
    throw new Error(error.message || 'Failed to submit service for approval')
  }
}

export const cancelOrder = async (orderId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_CANCEL(orderId), {})
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to cancel order')
  }
}

export const getOrder = async (orderId) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ORDER(orderId))
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch order')
  }
}

export const sellerAcceptOrder = async (orderId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_ACCEPT(orderId), {})
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to accept order')
  }
}

export const sellerRejectOrder = async (orderId, reason = null) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_REJECT(orderId), {
      reason: reason || 'No reason provided'
    })
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to reject order')
  }
}

export const scanOrderToken = async (token, preview = false) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_SCAN, { token, preview })
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to scan token')
  }
}

export const masterCancelOrder = async (orderId, confirmationCode) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_CANCEL_MASTER(orderId), {
      confirmation_code: confirmationCode
    })
    return response.order
  } catch (error) {
    throw new Error(error.message || 'Failed to cancel order')
  }
}

/**
 * Bag API
 */
export const addToBag = async (productId, quantity = 1, selectedSize = null, selectedColor = null) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.BAG, {
      product_id: productId,
      quantity,
      selected_size: selectedSize,
      selected_color: selectedColor
    })
    return response.bag_item
  } catch (error) {
    throw new Error(error.message || 'Failed to add to bag')
  }
}

export const getBag = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.BAG)
    return response.bag_items || []
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch bag')
  }
}

export const updateBagItem = async (bagItemId, quantity = null, selectedSize = null, selectedColor = null) => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.API.BAG_ITEM(bagItemId), {
      quantity,
      selected_size: selectedSize,
      selected_color: selectedColor
    })
    return response.bag_item
  } catch (error) {
    throw new Error(error.message || 'Failed to update bag item')
  }
}

export const removeFromBag = async (bagItemId) => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.BAG_ITEM(bagItemId))
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to remove from bag')
  }
}

export const clearBag = async () => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.API.BAG_CLEAR)
    return response.message
  } catch (error) {
    throw new Error(error.message || 'Failed to clear bag')
  }
}

// Analytics API functions
export const getAnalyticsStats = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.STATS)
    return response.stats || response
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null to trigger fallback
    // Browser will log CORS errors - we silently handle them
    return null
  }
}

export const getAnalyticsUsers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.USERS)
    return response
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch users analytics')
  }
}

export const getSalesByCategory = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.SALES_BY_CATEGORY, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null to trigger fallback
    // Browser will log CORS errors - we silently handle them
    return null
  }
}

export const getSalesTrend = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.SALES_TREND, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return empty array
    // Browser will log CORS errors - we silently handle them
    return []
  }
}

export const getOrdersByStatus = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.ORDERS_BY_STATUS, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null to trigger fallback
    // Browser will log CORS errors - we silently handle them
    return null
  }
}

export const getRevenueVsCommissions = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.REVENUE_VS_COMMISSIONS, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return empty array
    // Browser will log CORS errors - we silently handle them
    return []
  }
}

export const getCustomerGrowth = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.CUSTOMER_GROWTH, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return empty array
    // Browser will log CORS errors - we silently handle them
    return []
  }
}

export const getReturningVsNew = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.RETURNING_VS_NEW, { params })
    return response.data || response || null
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null
    // Browser will log CORS errors - we silently handle them
    return null
  }
}


export const getTopProducts = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.TOP_PRODUCTS, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null to trigger fallback
    // Browser will log CORS errors - we silently handle them
    return null
  }
}

export const getSalesBySeller = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.SALES_BY_SELLER, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return empty array
    // Browser will log CORS errors - we silently handle them
    return []
  }
}

export const getActiveCounts = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.ACTIVE_COUNTS)
    return response.data || response || { activeUsers: 0, activeSellers: 0 }
  } catch (error) {
    return { activeUsers: 0, activeSellers: 0 }
  }
}

export const getWebContainerUrl = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.WEB_CONTAINER.GET_URL)
    return response || { url: '' }
  } catch (error) {
    return { url: '' }
  }
}

export const setWebContainerUrl = async (url) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.WEB_CONTAINER.SET_URL, { url })
    return response.data || response
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to save URL')
  }
}

export const enableNotifications = async (fcmToken = null) => {
  try {
    const response = await apiClient.post('/api/auth/enable-notifications', { fcm_token: fcmToken })
    return response.data || response
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to enable notifications')
  }
}

export const logoutUser = async () => {
  try {
    await apiClient.post('/api/auth/enable-notifications', { fcm_token: "" })
  } catch (e) {
    console.warn("Failed to clear FCM token on backend during logout:", e)
  }
}

