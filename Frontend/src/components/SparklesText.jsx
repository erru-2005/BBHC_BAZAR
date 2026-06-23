import { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'

const STAR_PATH =
  'M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z'

/** Place sparkle on one of four icon edges, hugging the perimeter */
function edgePosition() {
  const edge = Math.floor(Math.random() * 4)
  const along = 28 + Math.random() * 44

  switch (edge) {
    case 0:
      return { x: `${along}%`, y: '-2%' }
    case 1:
      return { x: '102%', y: `${along}%` }
    case 2:
      return { x: `${along}%`, y: '102%' }
    default:
      return { x: '-2%', y: `${along}%` }
  }
}

function Sparkle({ id, x, y, color, delay, scale, size }) {
  return (
    <motion.svg
      key={id}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, scale, 0],
        rotate: [0, 90, 180]
      }}
      transition={{ duration: 0.75, repeat: Infinity, delay }}
      width={size}
      height={size}
      viewBox="0 0 21 21"
      aria-hidden
    >
      <path d={STAR_PATH} fill={color} />
    </motion.svg>
  )
}

Sparkle.propTypes = {
  id: PropTypes.string.isRequired,
  x: PropTypes.string.isRequired,
  y: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  delay: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired
}

function SparklesText({
  text,
  children,
  className = '',
  sparklesCount = 4,
  sparkleSize = 10,
  edgeOnly = false,
  colors = { first: '#7dd3fc', second: '#f9a8d4' }
}) {
  const [sparkles, setSparkles] = useState([])

  const generateStar = useCallback(() => {
    const pos = edgeOnly ? edgePosition() : { x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }
    const color = Math.random() > 0.5 ? colors.first : colors.second
    const delay = Math.random() * 1.5
    const scale = Math.random() * 0.4 + 0.35
    const lifespan = Math.random() * 8 + 4
    const id = `${pos.x}-${pos.y}-${Date.now()}-${Math.random()}`
    return { id, x: pos.x, y: pos.y, color, delay, scale, lifespan }
  }, [colors.first, colors.second, edgeOnly])

  useEffect(() => {
    const initializeStars = () => {
      setSparkles(Array.from({ length: sparklesCount }, generateStar))
    }

    const updateStars = () => {
      setSparkles((current) =>
        current.map((star) =>
          star.lifespan <= 0 ? generateStar() : { ...star, lifespan: star.lifespan - 0.1 }
        )
      )
    }

    initializeStars()
    const interval = setInterval(updateStars, 100)
    return () => clearInterval(interval)
  }, [generateStar, sparklesCount])

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${className}`.trim()}
    >
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} {...sparkle} size={sparkleSize} />
      ))}
      <span className="relative z-10 inline-flex items-center justify-center">
        {children ?? text}
      </span>
    </span>
  )
}

SparklesText.propTypes = {
  text: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  sparklesCount: PropTypes.number,
  sparkleSize: PropTypes.number,
  edgeOnly: PropTypes.bool,
  colors: PropTypes.shape({
    first: PropTypes.string.isRequired,
    second: PropTypes.string.isRequired
  })
}

export default SparklesText
