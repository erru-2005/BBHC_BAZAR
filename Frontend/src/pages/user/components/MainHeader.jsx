import PropTypes from 'prop-types'

const navItems = [
  'Home',
  'Fresh Finds',
  'Deals',
  'Stores',
  'Electronics',
  'Fashion',
  'Books',
  'BBHC Smart Living',
  'Customer Care'
]

function MainHeader({ onOpenMenu, children }) {
  return (
    <header className="bg-[#131921] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-2xl" onClick={onOpenMenu} aria-label="Open navigation menu">
              ☰
            </button>
            <div className="bg-white text-[#131921] font-black tracking-tight text-xl px-3 py-1 rounded-sm shadow">
              BBHC<span className="text-pink-500">Bazaar</span>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs text-gray-300">Delivering to</span>
              <span className="font-semibold">BBHC Smart Campus 560001</span>
            </div>
          </div>

          <div className="flex-1 hidden md:block">
            <div className="flex bg-white rounded-md overflow-hidden shadow-inner">
              <select className="bg-gray-100 text-sm text-gray-700 px-3 border-r border-gray-200 outline-none">
                <option>All</option>
                <option>Home</option>
                <option>Electronics</option>
                <option>BBHC Organic</option>
              </select>
              <input type="text" placeholder="Search BBHCBazaar" className="flex-1 px-4 py-2 text-gray-800 outline-none" />
              <button className="px-4 bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold">Search</button>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium">
            <button className="hidden sm:block hover:text-amber-300 transition">Sign in</button>
            <button className="hidden sm:block hover:text-amber-300 transition">Orders</button>
            <button className="flex items-center gap-2 hover:text-amber-300 transition">
              <span>Bag</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12l-1 11H7L6 7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 10V6a3 3 0 016 0v4"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-200 py-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button key={item} className="hover:text-white whitespace-nowrap">
              {item}
            </button>
          ))}
        </div>

        {children}
      </div>
    </header>
  )
}

MainHeader.propTypes = {
  onOpenMenu: PropTypes.func.isRequired,
  children: PropTypes.node
}

export default MainHeader


