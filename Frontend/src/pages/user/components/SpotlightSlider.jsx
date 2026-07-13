import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { getImageUrl } from '../../../utils/image'

import { Link } from 'react-router-dom'

function SpotlightSlide({ slide, className = '' }) {
  const isExternal = slide.link && slide.link.startsWith('http')
  const Wrapper = isExternal ? 'a' : Link
  const linkProps = isExternal
    ? { href: slide.link, target: '_blank', rel: 'noopener noreferrer' }
    : { to: slide.link || '#' }

  return (
    <Wrapper
      {...linkProps}
      className={`relative overflow-hidden rounded-xl bg-slate-900 aspect-[16/9] lg:aspect-[2/1] block group ${className}`}
    >
      {slide.media_type === 'video' ? (
        <video
          src={getImageUrl(slide.image)}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={getImageUrl(slide.image)}
          alt={slide.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-5 text-white">
        {slide.title && (
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/80 sm:text-xs">
            {slide.title}
          </p>
        )}
        {slide.subtitle && (
          <p className="mt-0.5 text-lg font-black leading-tight sm:text-xl lg:text-2xl">
            {slide.subtitle}
          </p>
        )}
        {slide.cta && (
          <p className="mt-1 text-[11px] text-gray-200 sm:text-xs lg:text-sm">{slide.cta}</p>
        )}
      </div>
    </Wrapper>
  )
}

SpotlightSlide.propTypes = {
  slide: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    cta: PropTypes.string,
    image: PropTypes.string.isRequired,
    link: PropTypes.string,
    media_type: PropTypes.string
  }).isRequired,
  className: PropTypes.string
}

function CarouselDots({ count, activeIndex, onSelect }) {
  return (
    <div className="mt-2.5 lg:mt-3">
      <div className="flex justify-center gap-1.5 lg:gap-2">
        {Array.from({ length: count }).map((_, dotIndex) => (
          <button
            key={`dot-${dotIndex}`}
            type="button"
            className={`rounded-full transition-all ${
              dotIndex === activeIndex
                ? 'h-1.5 w-5 bg-slate-700 lg:h-2 lg:w-6'
                : 'h-1.5 w-1.5 bg-slate-300 lg:h-2 lg:w-2'
            }`}
            onClick={() => onSelect(dotIndex)}
            aria-label={`Show spotlight ${dotIndex + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

CarouselDots.propTypes = {
  count: PropTypes.number.isRequired,
  activeIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired
}

function buildExtendedSlides(slides, slidesPerView) {
  const count = slides.length
  if (count <= 1) return slides

  if (slidesPerView === 1) {
    return [slides[count - 1], ...slides, slides[0]]
  }

  return [slides[count - 1], ...slides, slides[0], slides[1]]
}

function useViewportWidth(ref) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const updateWidth = () => {
      setWidth(element.offsetWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return width
}

function useInfiniteCarousel(slides, { slidesPerView = 1, enabled = true } = {}) {
  const count = slides.length
  const loopEnabled = enabled && count > 1
  const startIndex = loopEnabled ? 1 : 0

  const extendedSlides = useMemo(
    () => (loopEnabled ? buildExtendedSlides(slides, slidesPerView) : slides),
    [slides, slidesPerView, loopEnabled]
  )

  const [index, setIndex] = useState(startIndex)
  const [animate, setAnimate] = useState(true)
  const indexRef = useRef(startIndex)

  const activeIndex = loopEnabled ? (index - 1 + count) % count : index

  const snapIfNeeded = useCallback(
    (currentIndex) => {
      if (!loopEnabled) return

      if (slidesPerView === 1) {
        if (currentIndex >= count + 1) {
          setAnimate(false)
          indexRef.current = 1
          setIndex(1)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setAnimate(true))
          })
        } else if (currentIndex <= 0) {
          setAnimate(false)
          indexRef.current = count
          setIndex(count)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setAnimate(true))
          })
        }
        return
      }

      if (currentIndex > count) {
        setAnimate(false)
        indexRef.current = 1
        setIndex(1)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAnimate(true))
        })
      } else if (currentIndex < 1) {
        setAnimate(false)
        indexRef.current = count
        setIndex(count)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAnimate(true))
        })
      }
    },
    [count, loopEnabled, slidesPerView]
  )

  const goTo = useCallback(
    (targetIndex) => {
      const nextIndex = loopEnabled ? targetIndex + 1 : targetIndex
      indexRef.current = nextIndex
      setAnimate(true)
      setIndex(nextIndex)
    },
    [loopEnabled]
  )

  const goNext = useCallback(() => {
    const nextIndex = loopEnabled
      ? indexRef.current + 1
      : (indexRef.current + 1) % count

    indexRef.current = nextIndex
    setAnimate(true)
    setIndex(nextIndex)
  }, [count, loopEnabled])

  const handleTransitionEnd = useCallback(() => {
    snapIfNeeded(indexRef.current)
  }, [snapIfNeeded])

  useEffect(() => {
    indexRef.current = startIndex
    setIndex(startIndex)
    setAnimate(true)
  }, [slides, startIndex])

  useEffect(() => {
    if (!count) return

    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [count, goNext])

  const slideCount = extendedSlides.length

  const translateX = useMemo(() => {
    if (slidesPerView === 1) {
      return `-${(index * 100) / slideCount}%`
    }

    return `calc(-${index} * (50% + 0.375rem))`
  }, [index, slideCount, slidesPerView])

  return {
    extendedSlides,
    slideIndex: index,
    activeIndex,
    animate,
    translateX,
    goTo,
    handleTransitionEnd
  }
}

function SpotlightSlider({ slides }) {
  const count = slides.length
  const mobileViewportRef = useRef(null)
  const mobileViewportWidth = useViewportWidth(mobileViewportRef)

  const mobileCarousel = useInfiniteCarousel(slides, {
    slidesPerView: 1,
    enabled: count > 1
  })
  const desktopCarousel = useInfiniteCarousel(slides, { slidesPerView: 2, enabled: count >= 3 })

  if (!count) return null

  return (
    <section className="pt-2 pb-3 lg:py-4">
      {/* Mobile: one full card centered with equal side margins */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-2 lg:hidden">
        <div ref={mobileViewportRef} className="w-full overflow-hidden rounded-2xl">
          <div
            className={`flex ${mobileCarousel.animate ? 'transition-transform duration-500 ease-out' : ''}`}
            style={{
              transform: mobileViewportWidth
                ? `translateX(-${mobileCarousel.slideIndex * mobileViewportWidth}px)`
                : undefined
            }}
            onTransitionEnd={mobileCarousel.handleTransitionEnd}
          >
            {mobileCarousel.extendedSlides.map((slide, slideIndex) => (
              <div
                key={`mobile-${slide.id}-${slideIndex}`}
                className={
                  mobileViewportWidth
                    ? 'shrink-0'
                    : 'w-full shrink-0 grow-0 basis-full'
                }
                style={mobileViewportWidth ? { width: mobileViewportWidth } : undefined}
              >
                <SpotlightSlide slide={slide} className="aspect-[4/3] rounded-2xl" />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && (
          <CarouselDots
            count={count}
            activeIndex={mobileCarousel.activeIndex}
            onSelect={mobileCarousel.goTo}
          />
        )}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        {count === 1 && (
          <SpotlightSlide slide={slides[0]} className="w-full rounded-xl" />
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {slides.map((slide) => (
              <SpotlightSlide key={slide.id} slide={slide} />
            ))}
          </div>
        )}

        {count >= 3 && (
          <>
            <div className="overflow-hidden">
              <div
                className={`flex gap-3 ${desktopCarousel.animate ? 'transition-transform duration-500 ease-out' : ''}`}
                style={{ transform: `translateX(${desktopCarousel.translateX})` }}
                onTransitionEnd={desktopCarousel.handleTransitionEnd}
              >
                {desktopCarousel.extendedSlides.map((slide, slideIndex) => (
                  <div
                    key={`desktop-${slide.id}-${slideIndex}`}
                    className="w-[calc(50%-0.375rem)] flex-shrink-0"
                  >
                    <SpotlightSlide slide={slide} />
                  </div>
                ))}
              </div>
            </div>

            <CarouselDots
              count={count}
              activeIndex={desktopCarousel.activeIndex}
              onSelect={desktopCarousel.goTo}
            />
          </>
        )}
      </div>
    </section>
  )
}

SpotlightSlider.propTypes = {
  slides: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string.isRequired,
      cta: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired
    })
  ).isRequired
}

export default SpotlightSlider
