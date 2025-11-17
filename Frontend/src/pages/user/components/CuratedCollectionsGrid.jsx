import PropTypes from 'prop-types'

function CuratedCollectionsGrid({ collections }) {
  if (!collections?.length) return null
  return (
    <section className="py-8">
      <div className="grid md:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <div key={collection.title} className="rounded-3xl overflow-hidden shadow bg-gradient-to-br from-white to-slate-50">
            <img src={collection.image} alt={collection.title} className="h-48 w-full object-cover" />
            <div className="p-6 space-y-3">
              <p className="text-xs uppercase tracking-wide text-amber-500 font-bold">Curated edit</p>
              <h3 className="text-xl font-bold">{collection.title}</h3>
              <p className="text-sm text-slate-600">{collection.tagline}</p>
              <button className="text-sm font-semibold text-amber-600">{collection.link} →</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

CuratedCollectionsGrid.propTypes = {
  collections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      tagline: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      link: PropTypes.string.isRequired
    })
  ).isRequired
}

export default CuratedCollectionsGrid


