/**
 * Active Counters Component
 * Displays real-time active user/seller/master/outlet counts
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaUsers, FaStore, FaUserShield, FaStoreAlt } from 'react-icons/fa'
import { initActiveCounterSocket, getActiveCounterSocket } from '../../../utils/activeCounterSocket'

const ActiveCounters = () => {
  const [counts, setCounts] = useState({
    users: 0,
    sellers: 0,
    masters: 0,
    outlets: 0
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection as 'master' role
    const socket = initActiveCounterSocket('master')

    // Listen for active_counts updates
    const handleActiveCounts = (data) => {
      if (data && typeof data === 'object') {
        setCounts({
          users: data.users || 0,
          sellers: data.sellers || 0,
          masters: data.masters || 0,
          outlets: data.outlets || 0
        })
      }
    }

    // Listen for connection status
    const handleConnect = () => {
      console.log('[ActiveCounters] Socket connected, requesting counts')
      setIsConnected(true)
      // Request current counts on connect
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('request_active_counts')
        }
      }, 500)
    }

    const handleDisconnect = (reason) => {
      console.log('[ActiveCounters] Socket disconnected. Reason:', reason)
      setIsConnected(false)
    }

    const handleConnectError = (error) => {
      console.error('[ActiveCounters] Connection error:', error)
      setIsConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('active_counts', handleActiveCounts)

    // Request initial counts immediately if already connected
    if (socket.connected) {
      console.log('[ActiveCounters] Socket already connected, requesting counts')
      socket.emit('request_active_counts')
    } else {
      // Also request after connection is established
      socket.once('connect', () => {
        setTimeout(() => {
          if (socket.connected) {
            console.log('[ActiveCounters] Requesting counts after connection')
            socket.emit('request_active_counts')
          }
        }, 500)
      })
    }

    // Also set up periodic refresh (every 5 seconds) as fallback
    const refreshInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('request_active_counts')
      }
    }, 5000)

    // Cleanup
    return () => {
      clearInterval(refreshInterval)
      socket.off('active_counts', handleActiveCounts)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [])

  const counterCards = [
    {
      label: 'Active Users',
      value: counts.users,
      icon: FaUsers,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Active Sellers',
      value: counts.sellers,
      icon: FaStore,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Active Masters',
      value: counts.masters,
      icon: FaUserShield,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-500 to-indigo-600'
    },
    {
      label: 'Active Outlets',
      value: counts.outlets,
      icon: FaStoreAlt,
      color: 'bg-orange-500',
      bgGradient: 'from-orange-500 to-orange-600'
    }
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Real-Time Active Counts</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {counterCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-gray-600 mb-1 truncate">{card.label}</p>
                <motion.p
                  key={card.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  {card.value.toLocaleString()}
                </motion.p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className={`mt-4 h-1 bg-gradient-to-r ${card.bgGradient} rounded-full`}></div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ActiveCounters

