import PropTypes from 'prop-types'

function CategoryGrid({ title, actionLabel, categories }) {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {actionLabel && <button className="text-sm font-semibold text-amber-600">{actionLabel}</button>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <div key={category.label} className="relative rounded-2xl overflow-hidden group shadow hover:shadow-lg transition">
            {category.image && <img src={category.image} alt={category.label} className="w-full h-36 object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <p className="absolute bottom-3 left-4 text-white font-semibold">{category.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

CategoryGrid.propTypes = {
  title: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      image: PropTypes.string
    })
  ).isRequired
}

export default CategoryGrid


