/**
 * Socket.IO client configuration and connection
 */
import { io } from 'socket.io-client'

// Socket.IO connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL 

// Create socket instance
let socket = null

/**
 * Initialize Socket.IO connection
 * @param {string} token - JWT access token (optional)
 * @returns {object} Socket instance
 */
export const initSocket = (token = null) => {
  if (socket && socket.connected) {
    return socket
  }

  const options = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
  }

  // Add authentication if token provided
  if (token) {
    options.auth = {
      token: token
    }
  }

  socket = io(SOCKET_URL, options)

  // Connection event handlers
  socket.on('connect', () => {
    // Socket connected
  })

  socket.on('disconnect', (reason) => {
    // Socket disconnected
  })

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error)
  })

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error)
  })

  return socket
}

/**
 * Get current socket instance
 * @returns {object|null} Socket instance or null
 */
export const getSocket = () => {
  return socket
}

/**
 * Disconnect Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
export const isSocketConnected = () => {
  return socket && socket.connected
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected
}

