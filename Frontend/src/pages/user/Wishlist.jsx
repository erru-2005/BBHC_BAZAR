import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import ProductShowcase from './components/ProductShowcase'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getProducts, getWishlist } from '../../services/api'
import { setHomeProducts, setHomeWishlist } from '../../store/dataSlice'

function Wishlist({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef

  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated || userType !== 'user') {
      navigate('/user/phone-entry', {
        state: {
          returnTo: '/wishlist',
          message: 'Please login to view your wishlist.'
        }
      })
    }
  }, [isAuthenticated, userType, navigate])

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || userType !== 'user') return
      setLoading(true)
      setError(null)
      try {
        // Always refresh wishlist to get latest IDs
        const wishlistItems = await getWishlist(200, 0)
        const ids = wishlistItems
          .map((item) => item.product_id || item.product_snapshot?.id)
          .filter(Boolean)
        dispatch(setHomeWishlist(ids))

        // Ensure we have products to match against
        if (!home?.products?.length) {
          const backendProducts = await getProducts()
          dispatch(setHomeProducts(backendProducts))
        }
      } catch (err) {
        setError(err.message || 'Failed to load wishlist')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [dispatch, home?.products?.length, isAuthenticated, userType])

  const wishlistProducts = useMemo(() => {
    if (!home?.wishlist?.length || !home?.products?.length) return []
    const idSet = new Set(home.wishlist.map((id) => String(id)))
    return home.products.filter((p) => idSet.has(String(p.id || p._id)))
  }, [home])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <div className="py-6">
          <h1 className="text-2xl font-bold text-slate-900">Wishlist</h1>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading your wishlist...'
              : wishlistProducts.length > 0
              ? `${wishlistProducts.length} item${wishlistProducts.length > 1 ? 's' : ''} saved`
              : 'Your wishlist is empty'}
          </p>
        </div>

        <ProductShowcase products={wishlistProducts} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || undefined} />
    </div>
  )
}

export default Wishlist


