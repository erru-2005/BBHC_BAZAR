import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ProductShowcase from './components/ProductShowcase'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getProducts } from '../../services/api'
import { setHomeProducts } from '../../store/dataSlice'

function useQueryParam(key) {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search).get(key) || '', [search, key])
}

function SearchResults({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef

  const query = useQueryParam('q').trim()
  const { home } = useSelector((state) => state.data)

  const products = useMemo(() => home?.products || [], [home])

  useEffect(() => {
    setSearchText(query)
  }, [query])

  const openFullSearch = () => {
    navigate('/', {
      state: {
        openSearch: true,
        searchQuery: searchText
      }
    })
  }

  // Load products if not cached
  useEffect(() => {
    const load = async () => {
      if (products.length > 0) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const backendProducts = await getProducts()
        dispatch(setHomeProducts(backendProducts))
      } catch (err) {
        setError(err.message || 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [products.length, dispatch])

  const filteredProducts = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return products.filter((product) => {
      const name = (product.product_name || '').toLowerCase()
      const spec = (product.specification || '').toLowerCase()
      const categories = Array.isArray(product.categories)
        ? product.categories
            .map((c) => (typeof c === 'string' ? c : c.name || c.title || c))
            .join(' ')
            .toLowerCase()
        : ''
      return name.includes(q) || spec.includes(q) || categories.includes(q)
    })
  }, [products, query])

  const resultTitle = query ? `Results for "${query}"` : 'Search'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const next = searchText.trim()
              navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-2 shadow-sm"
          >
            <input
              ref={headerLogoRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={openFullSearch}
              onClick={openFullSearch}
              placeholder="Search BBHCBazaar"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none"
            />
            <button
              type="submit"
              className="text-sm font-semibold text-[#131921] px-3 py-1 rounded-full hover:bg-slate-100 transition"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <ProductShowcase products={filteredProducts} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || undefined} />
    </div>
  )
}

export default SearchResults


