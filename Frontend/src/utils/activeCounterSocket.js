/**
 * Active Counter Socket Utility - Wrapper for Singleton Socket
 * Prevents multiple connections while maintaining compatibility
 */
import { initSocket, getSocket, disconnectSocket } from './socket'

/**
 * Initialize Socket.IO connection with role
 * @param {string} role - 'user', 'seller', 'master', or 'outlet'
 * @param {string} token - Authentication token (now required for security)
 */
export const initActiveCounterSocket = (role = 'user', token = null) => {
  // Use the shared singleton initialization
  return initSocket(token, role)
}

/**
 * Get socket instance for a specific role (returns same singleton)
 */
export const getActiveCounterSocket = () => {
  return getSocket()
}

/**
 * Disconnect socket (disconnects shared singleton)
 */
export const disconnectActiveCounterSocket = () => {
  disconnectSocket()
}

/**
 * Disconnect all (same as above)
 */
export const disconnectAllActiveCounterSockets = () => {
  disconnectSocket()
}

/**
 * Check connectivity
 */
export const isActiveCounterSocketConnected = () => {
  const socket = getSocket()
  return socket && socket.connected
}

export default {
  initActiveCounterSocket,
  getActiveCounterSocket,
  disconnectActiveCounterSocket,
  disconnectAllActiveCounterSockets,
  isActiveCounterSocketConnected
}

