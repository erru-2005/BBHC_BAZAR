import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const ChevronRightIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export function SlideToUnlock({
  children,
  onUnlock,
  sliderText = 'Swipe to confirm purchase',
  unlockedContent,
  className,
  shimmer = true,
  bare = false,
  unlocked: controlledUnlocked,
  disabled = false,
  resetKey = null
}) {
  const [internalUnlocked, setInternalUnlocked] = useState(false)
  const [dragConstraint, setDragConstraint] = useState(0)
  const x = useMotionValue(0)

  const sliderRef = useRef(null)
  const handleRef = useRef(null)

  const unlocked = controlledUnlocked !== undefined ? controlledUnlocked : internalUnlocked

  useEffect(() => {
    const updateConstraint = () => {
      const sliderWidth = sliderRef.current?.offsetWidth || 0
      const handleWidth = handleRef.current?.offsetWidth || 0
      setDragConstraint(Math.max(0, sliderWidth - handleWidth))
    }

    updateConstraint()
    window.addEventListener('resize', updateConstraint)
    return () => window.removeEventListener('resize', updateConstraint)
  }, [])

  useEffect(() => {
    setInternalUnlocked(false)
    x.set(0)
  }, [resetKey, x])

  const onDragEnd = (_event, info) => {
    if (disabled) {
      x.set(0)
      return
    }

    const passedDistance = info.offset.x > dragConstraint * 0.55
    const fastSwipe = info.velocity.x > 250 && info.offset.x > dragConstraint * 0.35

    if (passedDistance || fastSwipe) {
      x.set(dragConstraint)
      if (controlledUnlocked === undefined) {
        setInternalUnlocked(true)
      }
      onUnlock?.()
    } else {
      x.set(0)
    }
  }

  const textOpacity = useTransform(x, [0, 50], [1, 0])

  const slider = (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div
          key="slider"
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={cn(!bare && 'mt-6', bare && 'w-full')}
        >
          <div
            ref={sliderRef}
            className={cn(
              'relative h-14 w-full rounded-full',
              bare ? 'bg-emerald-100 border border-emerald-200' : 'bg-slate-100'
            )}
          >
            <motion.div
              ref={handleRef}
              drag={disabled ? false : 'x'}
              dragConstraints={{ left: 0, right: dragConstraint }}
              dragElastic={0.25}
              dragMomentum={false}
              style={{ x }}
              onDragEnd={onDragEnd}
              className={cn(
                'absolute left-0 top-0 z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-md',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing',
                bare ? 'bg-emerald-700' : 'bg-slate-900'
              )}
            >
              <ChevronRightIcon className="h-6 w-6 text-white" />
            </motion.div>
            <motion.span
              style={{ opacity: textOpacity }}
              className={cn(
                'absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase tracking-widest',
                bare ? 'text-emerald-800' : 'text-slate-500',
                shimmer && 'animate-shimmer-text bg-[linear-gradient(110deg,#047857,45%,#6ee7b7,55%,#047857)] bg-clip-text text-transparent'
              )}
            >
              {sliderText}
            </motion.span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="unlocked"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {unlockedContent}
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (bare) {
    return <div className={cn('w-full', className)}>{slider}</div>
  }

  return (
    <div
      className={cn(
        'relative w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm',
        className
      )}
    >
      {children}
      {slider}
    </div>
  )
}

SlideToUnlock.propTypes = {
  children: PropTypes.node,
  onUnlock: PropTypes.func,
  sliderText: PropTypes.string,
  unlockedContent: PropTypes.node,
  className: PropTypes.string,
  shimmer: PropTypes.bool,
  bare: PropTypes.bool,
  unlocked: PropTypes.bool,
  disabled: PropTypes.bool,
  resetKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])
}

export default SlideToUnlock
