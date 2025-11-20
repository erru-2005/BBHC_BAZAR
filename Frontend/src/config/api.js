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
  },
  API: {
    REGISTER_MASTER: `${API_BASE_URL}/api/register_master`,
    REGISTER_SELLER: `${API_BASE_URL}/api/register_seller`,
    GET_SELLERS: `${API_BASE_URL}/api/sellers`,
    GET_MASTERS: `${API_BASE_URL}/api/masters`,
    GET_BLACKLISTED_SELLERS: `${API_BASE_URL}/api/sellers/blacklisted`,
    UPDATE_SELLER: (sellerId) => `${API_BASE_URL}/api/sellers/${sellerId}`,
    BLACKLIST_SELLER: (sellerId) => `${API_BASE_URL}/api/sellers/${sellerId}/blacklist`,
    PRODUCTS: `${API_BASE_URL}/api/products`,
    SELLER_PRODUCTS: `${API_BASE_URL}/api/seller/products`,
    SELLER_PRODUCT: (productId) => `${API_BASE_URL}/api/seller/products/${productId}`,
    CATEGORIES: `${API_BASE_URL}/api/categories`
  }
}

