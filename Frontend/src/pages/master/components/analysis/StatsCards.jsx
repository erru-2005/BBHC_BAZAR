/**
 * Real-time Stats Cards Component
 * Shows users, active users, sellers, and active sellers with real-time updates
 */
import { useEffect, useState } from 'react'
import { FaUsers, FaUserCheck, FaStore, FaStoreAlt, FaShoppingCart, FaBox, FaRupeeSign } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

const StatsCards = ({ stats, isLoading }) => {
  const [animatedStats, setAnimatedStats] = useState({
    activeUsers: 0,
    activeSellers: 0
  })

  useEffect(() => {
    if (stats) {
      // Animate numbers counting up
      const duration = 1000
      const steps = 60
      const interval = duration / steps

      const animateValue = (start, end, setter) => {
        const difference = end - start
        const increment = difference / steps
        let current = start
        let stepCount = 0

        const timer = setInterval(() => {
          stepCount++
          current += increment
          if (stepCount >= steps) {
            setter(end)
            clearInterval(timer)
          } else {
            setter(Math.round(current))
          }
        }, interval)

        return timer
      }

      const timers = [
        animateValue(animatedStats.activeUsers, stats.activeUsers || 0, (val) => 
          setAnimatedStats(prev => ({ ...prev, activeUsers: val }))
        ),
        animateValue(animatedStats.activeSellers, stats.activeSellers || 0, (val) => 
          setAnimatedStats(prev => ({ ...prev, activeSellers: val }))
        )
      ]

      return () => timers.forEach(timer => clearInterval(timer))
    }
  }, [stats])

  const cardData = [
    {
      title: 'Active Users',
      value: animatedStats.activeUsers,
      icon: FaUserCheck,
      color: 'bg-green-500',
      bgGradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Active Sellers',
      value: animatedStats.activeSellers,
      icon: FaStoreAlt,
      color: 'bg-orange-500',
      bgGradient: 'from-orange-500 to-orange-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <AnimatePresence>
        {cardData.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-gray-600 mb-1 truncate">{card.title}</p>
                {isLoading ? (
                  <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <motion.p
                    key={card.value}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-2xl sm:text-3xl font-bold text-gray-900"
                  >
                    {card.format ? card.format(card.value) : card.value.toLocaleString()}
                  </motion.p>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className={`mt-4 h-1 bg-gradient-to-r ${card.bgGradient} rounded-full`}></div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default StatsCards

