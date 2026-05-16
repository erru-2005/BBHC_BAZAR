import { motion } from 'framer-motion'

export default function SuccessAnimation() {
  const confettiColors = ['#FFD700', '#FF4500', '#1E90FF', '#32CD32', '#FF1493', '#8A2BE2']
  const shapes = ['rect', 'circle', 'strip']
  
  return (
    <div className="relative flex items-center justify-center py-8">
      {/* Central Tick Circle */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 260, 
          damping: 20,
          delay: 0.2
        }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] z-20"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      {/* Bursting Particles (The Sparkles) */}
      {Array.from({ length: 60 }).map((_, index) => {
        const color = confettiColors[index % confettiColors.length]
        const angle = (index / 60) * Math.PI * 2 + (Math.random() * 0.5)
        const distance = 80 + Math.random() * 150
        const size = 4 + Math.random() * 10
        const shape = shapes[index % shapes.length]
        const delay = (Math.random() * 0.8)
        const duration = 3 + Math.random() * 2

        return (
          <motion.div
            key={index}
            className="absolute z-10"
            initial={{ 
              opacity: 0, 
              scale: 0, 
              x: 0, 
              y: 0,
              rotate: 0
            }}
            animate={{
              opacity: [0, 1, 1, 0.8, 0],
              scale: [0, 1.2, 1, 0.8, 0],
              x: [0, Math.cos(angle) * distance],
              y: [0, Math.sin(angle) * distance - 50, Math.sin(angle) * distance + 100],
              rotate: [0, Math.random() * 1440 - 720]
            }}
            transition={{
              duration: duration,
              delay: delay,
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: Math.random() * 1
            }}
            style={{
              width: shape === 'strip' ? size * 3 : size,
              height: shape === 'strip' ? size / 2 : size,
              backgroundColor: color,
              borderRadius: shape === 'circle' ? '50%' : '2px',
              boxShadow: `0 0 10px ${color}40`,
            }}
          />
        )
      })}

      {/* Ripple Effect */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ 
            duration: 2, 
            delay: 0.4 + (i * 0.3), 
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="absolute w-24 h-24 rounded-full border border-emerald-400/30 z-0"
        />
      ))}
    </div>
  )
}
