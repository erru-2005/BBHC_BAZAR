import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const GRADIENT_PALETTES = [
  { type: 'linear', stops: ['#ff6b6b', '#f06595'] },
  { type: 'linear', stops: ['#ff9a9e', '#fad0c4'] },
  { type: 'radial', stops: ['#f6d365', '#fda085'] },
  { type: 'linear', stops: ['#84fab0', '#8fd3f4'] },
  { type: 'radial', stops: ['#a18cd1', '#fbc2eb'] },
  { type: 'linear', stops: ['#ffecd2', '#fcb69f'] },
  { type: 'radial', stops: ['#f5576c', '#f093fb'] },
  { type: 'linear', stops: ['#4facfe', '#00f2fe'] }
]

const HEART_PATH = 'M10 17s-6.5-4.35-9-9C-1.5 1.5 4.5-1 10 4.5 15.5-1 21.5 1.5 19 8c-2.5 6-9 9-9 9z'

function HeartBurst({ trigger }) {
  const [particles, setParticles] = useState([])

  const paletteSequence = useMemo(() => GRADIENT_PALETTES, [])

  useEffect(() => {
    if (!trigger) return

    const burstId = `${trigger}-${Date.now()}`
    const hearts = Array.from({ length: 16 }).map((_, idx) => {
      const palette = paletteSequence[idx % paletteSequence.length]
      const gradId = `${burstId}-grad-${idx}`
      const radialId = `${burstId}-rad-${idx}`
      return {
        id: `${burstId}-${idx}`,
        palette,
        gradId,
        radialId,
        x: (Math.random() - 0.5) * 70,
        y: 60 + Math.random() * 80,
        scale: 0.85 + Math.random() * 0.7,
        rotate: -18 + Math.random() * 36,
        delay: idx * 0.03
      }
    })

    setParticles(hearts)
    const timeout = setTimeout(() => setParticles([]), 2200)
    return () => clearTimeout(timeout)
  }, [trigger, paletteSequence])

  if (!particles.length) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {particles.map((heart) => (
          <motion.span
            key={heart.id}
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.6, heart.scale, heart.scale * 0.9],
              x: heart.x,
              y: [-10, -heart.y, -heart.y - 10],
              rotate: heart.rotate
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.4,
              ease: 'easeOut',
              delay: heart.delay
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md"
          >
            <svg width="22" height="20" viewBox="0 0 20 18" aria-hidden="true">
              <defs>
                {heart.palette.type === 'linear' ? (
                  <linearGradient id={heart.gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={heart.palette.stops[0]} />
                    <stop offset="100%" stopColor={heart.palette.stops[1]} />
                  </linearGradient>
                ) : (
                  <radialGradient id={heart.radialId} cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor={heart.palette.stops[1]} />
                    <stop offset="90%" stopColor={heart.palette.stops[0]} />
                  </radialGradient>
                )}
              </defs>
              <path
                d={HEART_PATH}
                fill={`url(#${heart.palette.type === 'linear' ? heart.gradId : heart.radialId})`}
              />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default HeartBurst

