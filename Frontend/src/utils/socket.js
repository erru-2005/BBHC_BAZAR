/**
 * Socket.IO client configuration and connection
 * Centralized singleton socket management
 */
import { io } from 'socket.io-client'

// Socket.IO connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

// Singleton socket instance and state
let socketInstance = null
let currentAuth = { token: null, role: null }

/**
 * Initialize Socket.IO connection
 * @param {string} token - JWT access token
 * @param {string} role - User role (user, seller, master, outlet)
 * @returns {object} Socket instance
 */
export const initSocket = (token = null, role = 'user') => {
  // If socket already exists and auth matches, return it
  if (socketInstance && socketInstance.connected) {
    if (currentAuth.token === token && currentAuth.role === role) {
      return socketInstance
    }
    // If auth changed, disconnect old socket
    console.log('[Socket] Auth changed (role/token), reconnecting...')
    socketInstance.disconnect()
  }

  currentAuth = { token, role }

  const options = {
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000,
    auth: {
      token: token,
      role: role
    }
  }

  console.log('[Socket] Creating new connection...')
  socketInstance = io(SOCKET_URL, options)

  // Once connected, request session initialization
  socketInstance.on('connect', () => {
    console.log(`[Socket] Connected. SID: ${socketInstance.id} | Role: ${role}`)
    console.log('[Socket] Handshake stable, initializing session...')
    socketInstance.emit('init_session', { token, role })
  })

  socketInstance.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected. Reason: ${reason}`)
  })

  socketInstance.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message)
  })

  return socketInstance
}

/**
 * Get current socket instance
 */
export const getSocket = () => {
  return socketInstance
}

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('[Socket] Manually disconnecting singleton...')
    socketInstance.disconnect()
    socketInstance = null
    currentAuth = { token: null, role: null }
  }
}

/**
 * Check connectivity
 */
export const isSocketConnected = () => {
  return socketInstance && socketInstance.connected
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected
}
