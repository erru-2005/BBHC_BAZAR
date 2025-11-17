import PropTypes from 'prop-types'

function HeroBanner({ slide, updatedText }) {
  if (!slide) return null

  return (
    <section className="py-6">
      <div className="bg-white rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-0">
          <div className="p-8 space-y-5">
            <p className="text-sm uppercase tracking-widest text-amber-600 font-semibold">{slide.eyebrow}</p>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">{slide.title}</h2>
            <p className="text-slate-600">{slide.subtitle}</p>
            <button className="px-5 py-3 bg-[#131921] text-white rounded-full font-semibold shadow hover:bg-slate-900 transition">
              {slide.cta}
            </button>
            <p className="text-xs text-slate-400">Updated {updatedText}</p>
          </div>
          <div className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} blur-3xl opacity-80`}></div>
            <img src={slide.image} alt={slide.title} className="relative w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}

HeroBanner.propTypes = {
  slide: PropTypes.shape({
    eyebrow: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    cta: PropTypes.string,
    image: PropTypes.string,
    accent: PropTypes.string
  }),
  updatedText: PropTypes.string.isRequired
}

export default HeroBanner


