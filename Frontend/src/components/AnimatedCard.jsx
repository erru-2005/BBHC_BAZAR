/**
 * Animated Card Component
 * Example component using Framer Motion
 */
import { motion } from 'framer-motion'
import { motionVariants, transitions } from '../utils/animations'

function AnimatedCard({ children, className = '', delay = 0, variant = 'fadeIn' }) {
  return (
    <motion.div
      className={className}
      initial={motionVariants[variant]?.initial || { opacity: 0 }}
      animate={motionVariants[variant]?.animate || { opacity: 1 }}
      exit={motionVariants[variant]?.exit || { opacity: 0 }}
      transition={{ ...transitions.smooth, delay }}
      whileHover={{ scale: 1.02, transition: transitions.smooth }}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedCard

