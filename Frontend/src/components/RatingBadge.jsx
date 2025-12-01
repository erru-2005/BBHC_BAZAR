import PropTypes from 'prop-types'
import { FaStar } from 'react-icons/fa'

const sizeTokens = {
  sm: {
    padding: 'px-2.5 py-0.5',
    text: 'text-[10px] sm:text-xs',
    icon: 'w-3 h-3'
  },
  md: {
    padding: 'px-3 py-1',
    text: 'text-xs sm:text-sm',
    icon: 'w-3.5 h-3.5'
  },
  lg: {
    padding: 'px-4 py-1.5',
    text: 'text-sm sm:text-base',
    icon: 'w-4 h-4'
  }
}

const getBadgePalette = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return {
      border: 'border-gray-200',
      bg: 'bg-gray-50',
      text: 'text-gray-600'
    }
  }

  if (value <= 2) {
    return {
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-600'
    }
  }

  if (value < 4) {
    return {
      border: 'border-lime-200',
      bg: 'bg-lime-50',
      text: 'text-lime-700'
    }
  }

  return {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700'
  }
}

function RatingBadge({ value, displayValue, label, size = 'md', className = '' }) {
  const ratingValue = typeof value === 'number' ? value : null
  const palette = getBadgePalette(ratingValue)
  const sizeToken = sizeTokens[size] || sizeTokens.md
  const formattedValue =
    typeof displayValue === 'string'
      ? displayValue
      : ratingValue !== null
        ? (Number.isInteger(ratingValue) ? ratingValue.toString() : ratingValue.toFixed(1))
        : '–'

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-semibold
        ${palette.bg} ${palette.border} ${palette.text}
        ${sizeToken.padding} ${sizeToken.text} ${className}
      `.trim()}
    >
      <FaStar className={`${sizeToken.icon} flex-shrink-0`} />
      <span>{formattedValue}</span>
      {label && <span className="font-medium text-[10px] sm:text-xs text-gray-600/70">{label}</span>}
    </span>
  )
}

RatingBadge.propTypes = {
  value: PropTypes.number,
  displayValue: PropTypes.string,
  label: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
}

export default RatingBadge


