import PropTypes from 'prop-types'

function CircleCategoryScroller({ labels }) {
  if (!labels?.length) return null
  return (
    <section className="lg:hidden py-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold text-slate-900">Shop by category</h3>
        <button className="text-sm font-semibold text-amber-600">See all</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {labels.map((label) => (
          <div key={label} className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold text-[#131921]">
              {label.slice(0, 1)}
            </div>
            <p className="text-xs text-slate-600 mt-2">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

CircleCategoryScroller.propTypes = {
  labels: PropTypes.arrayOf(PropTypes.string).isRequired
}

export default CircleCategoryScroller


