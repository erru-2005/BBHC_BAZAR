import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

function SpotlightSlider({ slides }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!slides?.length) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides])

  if (!slides?.length) return null
  const activeSlide = slides[index]

  return (
    <section className="pt-4 pb-6">
      <div className="bg-white rounded-[28px] shadow overflow-hidden relative h-80 lg:h-[28rem]">
        <img
          src={activeSlide.image}
          alt={activeSlide.title}
          className="w-full h-full object-cover transition-opacity duration-700"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white">
          <p className="uppercase text-sm tracking-[0.2em]">{activeSlide.title}</p>
          <p className="text-3xl lg:text-4xl font-black">{activeSlide.subtitle}</p>
          <p className="text-sm lg:text-base text-gray-200 mt-2">{activeSlide.cta}</p>
        </div>
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.id}
              className={`w-2.5 h-2.5 rounded-full ${dotIndex === index ? 'bg-white' : 'bg-white/40'}`}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Show spotlight ${dotIndex + 1}`}
            />
          ))}
        </div>
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


