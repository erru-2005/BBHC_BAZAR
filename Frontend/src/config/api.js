/**
 * API Configuration
 */
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'

export const API_ENDPOINTS = {
  AUTH: {
    MASTER_LOGIN: `${API_BASE_URL}/api/auth/master/login`,
    SELLER_LOGIN: `${API_BASE_URL}/api/auth/seller/login`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
    ME: `${API_BASE_URL}/api/auth/me`
  }
}

