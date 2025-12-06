/**
 * API Service for making HTTP requests using axios
 */
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import { setDeviceToken } from '../utils/device'
import { store } from '../store'
import { setToken, logout } from '../store/authSlice'

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    // Skip adding token if this is a refresh request (to avoid loops)
    if (config.skipAuthRefresh) {
      return config
    }
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Removed warning - it's normal for public endpoints to not have tokens
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

      const refreshToken = localStorage.getItem('refresh_token')
      
      // If no refresh token, logout immediately
      if (!refreshToken) {
        isRefreshing = false
        processQueue(new Error('No refresh token available'), null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
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
        
        // Update stored token
        localStorage.setItem('token', newAccessToken)
        
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
        
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        
        // Dispatch logout action
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
export const sendUserOTP = async (phoneNumber) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.USER_SEND_OTP, {
      phone_number: phoneNumber
    })

    return {
      otp_session_id: response.otp_session_id,
      phone_number: response.phone_number,
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
      phone_number_masked: response.phone_number_masked,
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
export const getSellers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.GET_SELLERS)
    return response.sellers || []
  } catch (error) {
    throw new Error(error.message || 'Failed to get sellers')
  }
}

/**
 * Get all outlet men
 * @returns {Promise} List of outlet men
 */
export const getOutletMen = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.GET_OUTLET_MEN)
    return response.outlet_men || []
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
export const getProducts = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.PRODUCTS)
    return response.products || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load products')
  }
}

/**
 * Get a single product by ID
 * Note: Fetches from backend and resolves the matching product.
 * @param {string} productId
 * @returns {Promise<object>} Product object
 */
export const getProductById = async (productId) => {
  if (!productId) {
    throw new Error('Product ID is required')
  }

  try {
    const products = await getProducts()
    const match = products.find(
      (prod) => String(prod.id || prod._id) === String(productId)
    )

    if (!match) {
      throw new Error('Product not found')
    }

    return match
  } catch (error) {
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
export const getCategories = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.CATEGORIES)
    return response.categories || []
  } catch (error) {
    throw new Error(error.message || 'Failed to load categories')
  }
}

export const createCategory = async (name) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.CATEGORIES, { name })
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
    const response = await apiClient.post(API_ENDPOINTS.API.APPROVE_PRODUCT(productId))
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

export const getOrders = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ORDERS, { params })
    return response.orders || []
  } catch (error) {
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

export const cancelOrder = async (orderId) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_CANCEL(orderId))
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
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_ACCEPT(orderId))
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

export const scanOrderToken = async (token) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.API.ORDER_SCAN, { token })
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

export const getStockLevels = async (params = {}) => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API.ANALYTICS.STOCK_LEVELS, { params })
    return response.data || response || []
  } catch (error) {
    // If endpoint doesn't exist (404) or CORS/network error, return null to trigger fallback
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
    // If endpoint doesn't exist (404) or CORS/network error, return default values
    // Browser will log CORS errors - we silently handle them
    return { activeUsers: 0, activeSellers: 0 }
  }
}

