/**
 * API Service for making HTTP requests
 */
import { API_ENDPOINTS } from '../config/api'

/**
 * Make API request
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
async function apiRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  // Add Authorization header if token exists
  const token = localStorage.getItem('token')
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }

    return data
  } catch (error) {
    throw error
  }
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} userType - 'seller' or 'master'
 * @returns {Promise} Login response with token and user data
 */
export const loginUser = async (email, password, userType) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    return {
      user: response.user,
      token: response.access_token,
      refreshToken: response.refresh_token,
      userType: userType,
    }
  } catch (error) {
    throw new Error(error.message || 'Login failed')
  }
}

/**
 * Register user
 * @param {object} userData - User registration data
 * @returns {Promise} Registration response
 */
export const registerUser = async (userData) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    })

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
    const response = await apiRequest(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
    })

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
    const response = await apiRequest(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    return response.access_token
  } catch (error) {
    throw new Error(error.message || 'Token refresh failed')
  }
}

