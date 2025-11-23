/**
 * API Service for making HTTP requests using axios
 */
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import { setDeviceToken } from '../utils/device'

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn('No token found in localStorage for authenticated request')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Return the data, but also log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response.data)
    }
    return response.data
  },
  (error) => {
    // Handle 401 errors specifically
    if (error.response?.status === 401) {
      // Clear invalid token (only token stored in localStorage)
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      const message = error.response?.data?.error || 'Authentication failed. Please log in again.'
      throw new Error(message)
    }
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed'
    console.error('API Error:', error.response?.data || error.message)
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
    
    // Log response for debugging
    console.log('Master login API response:', response)

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
    
    // Log response for debugging
    console.log('Seller login API response:', response)

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
      console.log('Device token stored:', {
        hasToken: !!response.device_token,
        deviceId: response.device_id,
        userType: response.userType
      })
    } else {
      console.warn('Device token not received from backend:', {
        hasToken: !!response.device_token,
        hasDeviceId: !!response.device_id,
        hasUserType: !!response.userType,
        responseKeys: Object.keys(response)
      })
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

