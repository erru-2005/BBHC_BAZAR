import { FaMagnifyingGlass, FaLocationDot } from 'react-icons/fa6'

function MobileSearchBar() {
  return (
    <div className="md:hidden space-y-3 pb-4">
      <div className="flex bg-white rounded-full overflow-hidden shadow-inner">
        <div className="flex items-center px-3 border-r border-gray-200">
          <FaMagnifyingGlass className="text-gray-400 w-4 h-4" />
        </div>
        <input type="text" placeholder="Search BBHCBazaar" className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none" />
        <button className="px-4 bg-amber-400 text-gray-900 font-semibold text-sm">Search</button>
      </div>
      <a 
        href="https://maps.app.goo.gl/VxcqFH7aferTNzPx8" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-gray-200 hover:text-white transition whitespace-nowrap overflow-x-auto"
      >
        <FaLocationDot className="text-pink-500 w-4 h-4 flex-shrink-0" />
        <span className="text-xs text-gray-300 whitespace-nowrap">Delivering to</span>
        <span className="font-semibold text-sm whitespace-nowrap">BBHCBazaar Outlet, kundapura 576201</span>
      </a>
    </div>
  )
}

export default MobileSearchBar


