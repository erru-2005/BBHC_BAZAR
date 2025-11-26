import { FaMagnifyingGlass, FaLocationDot } from 'react-icons/fa6'

function MobileSearchBar() {
  return (
    <div className="md:hidden space-y-3 pb-4">
      {/* White pill search bar for mobile, matching header style */}
      <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-inner">
        <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search BBHCBazaar"
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none"
        />
      </div>

      {/* Location row kept but colors tuned to match header */}
      <a
        href="https://maps.app.goo.gl/VxcqFH7aferTNzPx8"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition whitespace-nowrap overflow-x-auto"
      >
        <FaLocationDot className="text-pink-500 w-4 h-4 flex-shrink-0" />
        <span className="text-xs text-gray-400 font-normal whitespace-nowrap">Delivering to</span>
        <span className="text-xs text-gray-200 font-medium whitespace-nowrap">
          BBHCBazaar Outlet, Kundapura 576201
        </span>
      </a>
    </div>
  )
}

export default MobileSearchBar


