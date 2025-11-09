/**
 * React hook for Socket.IO
 */
import { useEffect, useState, useRef } from 'react'
import { initSocket, getSocket, disconnectSocket, isSocketConnected } from '../utils/socket'

/**
 * Custom hook for Socket.IO connection
 * @param {string} token - JWT access token (optional)
 * @param {boolean} autoConnect - Auto connect on mount
 * @returns {object} Socket instance and connection status
 */
export const useSocket = (token = null, autoConnect = true) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (autoConnect) {
      // Initialize socket
      const socketInstance = initSocket(token)
      socketRef.current = socketInstance
      setSocket(socketInstance)

      // Connection status handlers
      socketInstance.on('connect', () => {
        setIsConnected(true)
        setConnectionError(null)
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error) => {
        setConnectionError(error.message || 'Connection failed')
        setIsConnected(false)
      })

      socketInstance.on('connected', (data) => {
        console.log('Socket connected:', data)
        setIsConnected(true)
      })

      socketInstance.on('error', (error) => {
        setConnectionError(error.message || 'Socket error')
      })

      // Check initial connection status
      setIsConnected(socketInstance.connected)
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        disconnectSocket()
      }
    }
  }, [token, autoConnect])

  return {
    socket: socket || socketRef.current,
    isConnected,
    connectionError,
    reconnect: () => {
      if (socketRef.current) {
        socketRef.current.connect()
      } else {
        const newSocket = initSocket(token)
        socketRef.current = newSocket
        setSocket(newSocket)
      }
    },
    disconnect: () => {
      if (socketRef.current) {
        disconnectSocket()
        setIsConnected(false)
      }
    }
  }
}

export default useSocket

