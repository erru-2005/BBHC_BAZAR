import { useState } from 'react'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import SearchOverlay from './SearchOverlay'

function MobileSearchBar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <div className="md:hidden pb-1">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center gap-2 bg-white rounded-full px-3 py-2.5 shadow-inner cursor-text text-left"
          aria-label="Open search"
        >
          <FaMagnifyingGlass className="text-gray-400 w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-sm text-gray-500 select-none">
            Search BBHCBazaar
          </span>
        </button>
      </div>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

export default MobileSearchBar
