import PropTypes from 'prop-types'

function MobileBottomNav({ items }) {
  if (!items?.length) return null

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between">
        {items.map((item) => (
          <button key={item.label} className="flex flex-col items-center text-xs text-slate-600">
            <span className="text-xl mb-1">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

MobileBottomNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired
    })
  ).isRequired
}

export default MobileBottomNav


