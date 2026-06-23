import { useState, cloneElement } from 'react'
import PropTypes from 'prop-types'

/**
 * Floating pill nav with per-tab limelight locked to each icon via CSS centering.
 */
export function LimelightNav({
  items = [],
  defaultActiveIndex = 0,
  activeIndex: controlledActiveIndex,
  onTabChange,
  className = '',
  limelightClassName = '',
  iconContainerClassName = '',
  iconClassName = '',
  labelClassName = '',
}) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(defaultActiveIndex)

  const activeIndex =
    controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveIndex

  if (items.length === 0) {
    return null
  }

  const handleItemClick = (index, itemOnClick) => {
    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(index)
    }
    onTabChange?.(index)
    itemOnClick?.()
  }

  return (
    <nav
      className={`relative inline-flex h-[76px] w-full items-center overflow-hidden rounded-2xl border border-white/10 bg-[#161616]/95 px-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl ${className}`}
    >
      {items.map(({ id, icon, label, onClick }, index) => {
        const isActive = activeIndex === index

        return (
          <button
            key={id}
            type="button"
            className={`relative z-20 flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-1.5 ${iconContainerClassName}`}
            onClick={() => handleItemClick(index, onClick)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              className={`pointer-events-none absolute top-0 left-1/2 z-0 flex -translate-x-1/2 flex-col items-center transition-opacity duration-300 ${
                isActive ? 'opacity-100' : 'opacity-0'
              } ${limelightClassName}`}
              aria-hidden="true"
            >
              <div className="h-[5px] w-11 shrink-0 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
              <div className="h-12 w-14 shrink-0 bg-gradient-to-b from-white/28 to-transparent [clip-path:polygon(10%_100%,28%_0,72%_0,90%_100%)]" />
            </div>

            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
              {cloneElement(icon, {
                className: `h-[22px] w-[22px] transition-opacity duration-200 ease-in-out ${
                  isActive ? 'opacity-100' : 'opacity-40'
                } ${icon.props.className || ''} ${iconClassName || ''}`,
              })}
            </span>

            {label ? (
              <span
                className={`relative z-10 max-w-full truncate text-[10px] font-medium leading-none transition-opacity duration-200 ${
                  isActive ? 'text-white opacity-100' : 'text-white/40'
                } ${labelClassName}`}
              >
                {label}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

LimelightNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      icon: PropTypes.element.isRequired,
      label: PropTypes.string,
      onClick: PropTypes.func,
    })
  ),
  defaultActiveIndex: PropTypes.number,
  activeIndex: PropTypes.number,
  onTabChange: PropTypes.func,
  className: PropTypes.string,
  limelightClassName: PropTypes.string,
  iconContainerClassName: PropTypes.string,
  iconClassName: PropTypes.string,
  labelClassName: PropTypes.string,
}
