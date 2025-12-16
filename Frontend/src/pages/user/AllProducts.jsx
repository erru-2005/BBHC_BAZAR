import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import ProductShowcase from './components/ProductShowcase'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getProducts, getWishlist } from '../../services/api'
import { setHomeProducts, setHomeWishlist } from '../../store/dataSlice'
import { useDispatch } from 'react-redux'

function AllProducts({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef

  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const products = useMemo(() => home?.products || [], [home])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Load products if not already in cache
        if (!home?.products?.length) {
          const backendProducts = await getProducts()
          dispatch(setHomeProducts(backendProducts))
        }

        // Refresh wishlist ids for authenticated users
        if (isAuthenticated && userType === 'user') {
          try {
            const wishlistItems = await getWishlist(200, 0)
            const ids = wishlistItems
              .map((item) => item.product_id || item.product_snapshot?.id)
              .filter(Boolean)
            dispatch(setHomeWishlist(ids))
          } catch (err) {
            // ignore wishlist errors on this page
            console.error('Failed to refresh wishlist:', err)
          }
        } else {
          dispatch(setHomeWishlist([]))
        }
      } catch (err) {
        setError(err.message || 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [dispatch, home?.products?.length, isAuthenticated, userType])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <ProductShowcase products={products} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || undefined} />
    </div>
  )
}

export default AllProducts


