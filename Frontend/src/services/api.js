/**
 * API Service for making HTTP requests using axios
 */
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

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
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed'
    throw new Error(message)
  }
)

/**
 * Master login - Step 1: Validate credentials and get OTP session
 * @param {string} username - Master username
 * @param {string} password - Master password
 * @returns {Promise} Login response with OTP session ID
 */
export const masterLogin = async (username, password) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.MASTER_LOGIN, {
      username,
      password,
    })

    return {
      otp_session_id: response.otp_session_id,
      otp: response.otp, // Only for development
      message: response.message,
    }
  } catch (error) {
    throw new Error(error.message || 'Login failed')
  }
}

/**
 * Seller login - Step 1: Validate credentials and get OTP session
 * @param {string} username - Seller username
 * @param {string} password - Seller password
 * @returns {Promise} Login response with OTP session ID
 */
export const sellerLogin = async (username, password) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SELLER_LOGIN, {
      username,
      password,
    })

    return {
      otp_session_id: response.otp_session_id,
      otp: response.otp, // Only for development
      message: response.message,
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
export const verifyOTP = async (otp_session_id, otp) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      otp_session_id,
      otp,
    })

    // Store token in localStorage
    if (response.access_token) {
      localStorage.setItem('token', response.access_token)
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token)
      }
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
      }
      if (response.userType) {
        localStorage.setItem('userType', response.userType)
      }
    }

    return {
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
      userType: response.userType,
    }
  } catch (error) {
    throw new Error(error.message || 'OTP verification failed')
  }
}

/**
 * Register user
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

    return response.user
  } catch (error) {
    throw new Error(error.message || 'Failed to get user')
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

