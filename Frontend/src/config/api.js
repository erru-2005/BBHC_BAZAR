/**
 * API Configuration
 */
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'

export const API_ENDPOINTS = {
  AUTH: {
    MASTER_LOGIN: `${API_BASE_URL}/api/auth/master/login`,
    SELLER_LOGIN: `${API_BASE_URL}/api/auth/seller/login`,
    OUTLET_MAN_LOGIN: `${API_BASE_URL}/api/auth/outlet_man/login`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
    ME: `${API_BASE_URL}/api/auth/me`,
    USER_SEND_OTP: `${API_BASE_URL}/api/auth/user/send-otp`,
    USER_VERIFY_OTP: `${API_BASE_URL}/api/auth/user/verify-otp`,
    USER_REGISTER: `${API_BASE_URL}/api/auth/user/register`,
    USER_PROFILE: `${API_BASE_URL}/api/auth/user/profile`
  },
  API: {
    REGISTER_MASTER: `${API_BASE_URL}/api/register_master`,
    REGISTER_SELLER: `${API_BASE_URL}/api/register_seller`,
    REGISTER_OUTLET_MAN: `${API_BASE_URL}/api/register_outlet_man`,
    GET_SELLERS: `${API_BASE_URL}/api/sellers`,
    GET_OUTLET_MEN: `${API_BASE_URL}/api/outlet_men`,
    GET_MASTERS: `${API_BASE_URL}/api/masters`,
    GET_BLACKLISTED_SELLERS: `${API_BASE_URL}/api/sellers/blacklisted`,
    GET_BLACKLISTED_OUTLET_MEN: `${API_BASE_URL}/api/outlet_men/blacklisted`,
    UPDATE_SELLER: (sellerId) => `${API_BASE_URL}/api/sellers/${sellerId}`,
    UPDATE_OUTLET_MAN: (outletManId) => `${API_BASE_URL}/api/outlet_men/${outletManId}`,
    BLACKLIST_SELLER: (sellerId) => `${API_BASE_URL}/api/sellers/${sellerId}/blacklist`,
    BLACKLIST_OUTLET_MAN: (outletManId) => `${API_BASE_URL}/api/outlet_men/${outletManId}/blacklist`,
    UNBLACKLIST_OUTLET_MAN: (outletManId) => `${API_BASE_URL}/api/outlet_men/${outletManId}/blacklist`,
    PRODUCTS: `${API_BASE_URL}/api/products`,
    SELLER_PRODUCTS: `${API_BASE_URL}/api/seller/products`,
    SELLER_PRODUCT: (productId) => `${API_BASE_URL}/api/seller/products/${productId}`,
    CATEGORIES: `${API_BASE_URL}/api/categories`,
    PRODUCT_RATINGS: (productId) => `${API_BASE_URL}/api/products/${productId}/ratings`,
    PRODUCT_RATING_STATS: (productId) => `${API_BASE_URL}/api/products/${productId}/ratings/stats`,
    MY_RATING: (productId) => `${API_BASE_URL}/api/products/${productId}/ratings/me`,
    RATING_CATEGORY: (category) => `${API_BASE_URL}/api/ratings/category/${category}`,
    DELETE_RATING: (ratingId) => `${API_BASE_URL}/api/ratings/${ratingId}`,
    ORDERS: `${API_BASE_URL}/api/orders`,
    ORDER_STATUS: (orderId) => `${API_BASE_URL}/api/orders/${orderId}/status`,
    ORDER_CANCEL: (orderId) => `${API_BASE_URL}/api/orders/${orderId}/cancel`,
    BAG: `${API_BASE_URL}/api/bag`,
    BAG_ITEM: (bagItemId) => `${API_BASE_URL}/api/bag/${bagItemId}`,
    BAG_CLEAR: `${API_BASE_URL}/api/bag/clear`
  }
}

