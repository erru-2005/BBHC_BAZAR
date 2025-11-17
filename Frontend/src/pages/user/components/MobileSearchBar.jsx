function MobileSearchBar() {
  return (
    <div className="md:hidden space-y-3 pb-4">
      <div className="flex bg-white rounded-full overflow-hidden shadow-inner">
        <button className="px-3 text-gray-500 border-r border-gray-200 text-sm">All</button>
        <input type="text" placeholder="Search BBHCBazaar" className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none" />
        <button className="px-4 bg-amber-400 text-gray-900 font-semibold text-sm">Search</button>
      </div>
      <button className="flex items-center gap-2 text-xs text-gray-200">
        <span>📍</span>
        Delivering to BBHC Smart Campus • Update location
        <span className="text-lg leading-none">▾</span>
      </button>
    </div>
  )
}

export default MobileSearchBar


