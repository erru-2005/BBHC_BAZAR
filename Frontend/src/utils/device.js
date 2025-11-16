/**
 * Device ID and Token Management
 * Generates and stores unique device identifiers in localStorage
 */

const DEVICE_ID_KEY = 'bbhc_device_id'
const DEVICE_TOKEN_KEY = 'bbhc_device_token'
const DEVICE_USER_TYPE_KEY = 'bbhc_device_user_type'

/**
 * Generate or retrieve device ID
 * @returns {string} Device ID
 */
export const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  
  if (!deviceId) {
    // Generate a unique device ID
    deviceId = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  
  return deviceId
}

/**
 * Generate a unique device ID
 * @returns {string} Device ID
 */
const generateDeviceId = () => {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Get device ID from localStorage
 * @returns {string|null} Device ID or null
 */
export const getDeviceId = () => {
  return localStorage.getItem(DEVICE_ID_KEY)
}

/**
 * Get device token from localStorage
 * @returns {string|null} Device token or null
 */
export const getDeviceToken = () => {
  return localStorage.getItem(DEVICE_TOKEN_KEY)
}

/**
 * Store device token in localStorage
 * @param {string} token - Device token
 * @param {string} deviceId - Device ID
 * @param {string} userType - User type ('master' or 'seller')
 */
export const setDeviceToken = (token, deviceId, userType) => {
  localStorage.setItem(DEVICE_TOKEN_KEY, token)
  localStorage.setItem(DEVICE_ID_KEY, deviceId)
  localStorage.setItem(DEVICE_USER_TYPE_KEY, userType)
}

/**
 * Clear device token from localStorage
 */
export const clearDeviceToken = () => {
  localStorage.removeItem(DEVICE_TOKEN_KEY)
  localStorage.removeItem(DEVICE_USER_TYPE_KEY)
  // Keep device ID - it's permanent for this device
}

/**
 * Get stored user type for device token
 * @returns {string|null} User type or null
 */
export const getDeviceUserType = () => {
  return localStorage.getItem(DEVICE_USER_TYPE_KEY)
}

/**
 * Check if device token exists and matches user type
 * @param {string} userType - User type to check ('master' or 'seller')
 * @returns {boolean} True if device token exists and matches user type
 */
export const hasValidDeviceToken = (userType) => {
  const token = getDeviceToken()
  const storedUserType = getDeviceUserType()
  return token !== null && storedUserType === userType
}

