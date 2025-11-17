import PropTypes from 'prop-types'

const iconMap = {
  home: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 11.5 12 4l8 7.5M6 10.5V20h12v-9.5"
      />
    </svg>
  ),
  products: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M10 4v16" />
    </svg>
  ),
  services: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 7h3l2-2h4l1.5 1.5-2.5 2.5L19 14l-3 3-4-4-3 3-2-2 3-3-3-3z"
      />
    </svg>
  ),
  bag: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 11H7L6 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  ),
  account: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.015-8 4.5V20h16v-1.5C20 16.015 16.418 14 12 14Z"
      />
    </svg>
  ),
}

function MobileBottomNav({ items }) {
  if (!items?.length) return null

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between">
        {items.map((item) => (
          <button key={item.label} className="flex flex-col items-center text-xs text-slate-600">
            <span className="mb-1 text-slate-800">
              {iconMap[item.icon] ?? iconMap.home}
            </span>
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
      icon: PropTypes.string.isRequired,
    })
  ).isRequired,
}

export default MobileBottomNav

