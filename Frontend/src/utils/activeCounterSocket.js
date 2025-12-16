/**
 * Active Counter Socket Utility
 * Connects to socket with role-based tracking
 */
import { io } from 'socket.io-client'

// Socket.IO connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

// Create socket instances by role
const sockets = {
  user: null,
  seller: null,
  master: null,
  outlet: null
}

/**
 * Initialize Socket.IO connection with role
 * @param {string} role - 'user', 'seller', 'master', or 'outlet'
 * @param {object} options - Additional socket options
 * @returns {object} Socket instance
 */
export const initActiveCounterSocket = (role = 'user', options = {}) => {
  // Validate role
  const validRoles = ['user', 'seller', 'master', 'outlet']
  if (!validRoles.includes(role)) {
    console.warn(`Invalid role: ${role}. Defaulting to 'user'`)
    role = 'user'
  }

  // If socket already exists and is connected, return it
  if (sockets[role] && sockets[role].connected) {
    return sockets[role]
  }

  // Disconnect existing socket for this role if any
  if (sockets[role]) {
    sockets[role].disconnect()
  }

  // Create new socket with role in query parameters
  const socketOptions = {
    transports: ['polling'], // Force polling to avoid websocket invalid frame header
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000,
    forceNew: true, // Force new connection
    query: {
      role: role
    },
    ...options
  }

  console.log(`[Active Counter Socket] Initializing socket for role: ${role}, URL: ${SOCKET_URL}`)
  sockets[role] = io(SOCKET_URL, socketOptions)

  // Connection event handlers
  sockets[role].on('connect', () => {
    console.log(`[Active Counter Socket] Connected as ${role}. Socket ID: ${sockets[role].id}`)
  })

  sockets[role].on('disconnect', (reason) => {
    console.log(`[Active Counter Socket] Disconnected as ${role}. Reason: ${reason}`)
  })

  sockets[role].on('connected', (data) => {
    console.log(`[Active Counter Socket] Connection confirmed for ${role}:`, data)
  })

  sockets[role].on('connect_error', (error) => {
    console.error(`[Active Counter Socket] Connection error for ${role}:`, error)
  })

  sockets[role].on('error', (error) => {
    console.error(`[Active Counter Socket] Socket error for ${role}:`, error)
  })

  // Listen for active_counts broadcasts (for master dashboard)
  sockets[role].on('active_counts', (data) => {
    // Data received, no logging to reduce console noise
  })

  return sockets[role]
}

/**
 * Get socket instance for a specific role
 * @param {string} role - 'user', 'seller', 'master', or 'outlet'
 * @returns {object|null} Socket instance or null
 */
export const getActiveCounterSocket = (role = 'user') => {
  return sockets[role] || null
}

/**
 * Disconnect socket for a specific role
 * @param {string} role - 'user', 'seller', 'master', or 'outlet'
 */
export const disconnectActiveCounterSocket = (role) => {
  if (sockets[role]) {
    sockets[role].disconnect()
    sockets[role] = null
  }
}

/**
 * Disconnect all active counter sockets
 */
export const disconnectAllActiveCounterSockets = () => {
  Object.keys(sockets).forEach(role => {
    if (sockets[role]) {
      sockets[role].disconnect()
      sockets[role] = null
    }
  })
}

/**
 * Check if socket is connected for a specific role
 * @param {string} role - 'user', 'seller', 'master', or 'outlet'
 * @returns {boolean} Connection status
 */
export const isActiveCounterSocketConnected = (role = 'user') => {
  return sockets[role] && sockets[role].connected
}

export default {
  initActiveCounterSocket,
  getActiveCounterSocket,
  disconnectActiveCounterSocket,
  disconnectAllActiveCounterSockets,
  isActiveCounterSocketConnected
}

