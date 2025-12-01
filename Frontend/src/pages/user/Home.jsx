import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import CircleCategoryScroller from './components/CircleCategoryScroller'
import SpotlightSlider from './components/SpotlightSlider'
import CategoryGrid from './components/CategoryGrid'
import CuratedCollectionsGrid from './components/CuratedCollectionsGrid'
import RecommendationRow from './components/RecommendationRow'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import ProductShowcase from './components/ProductShowcase'
import LogoAnimation from '../../components/LogoAnimation'
import { setHomeProducts, setHomeWishlist, setError, setLoading } from '../../store/dataSlice'
import { getProducts, getWishlist } from '../../services/api'

const circleLabels = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty']

function Home({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoAnimation, setShowLogoAnimation] = useState(false)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef
  const prevLocationRef = useRef(location.pathname)

  const { home, loading, error } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)
  const homeData = home
  const {
    quickCategories,
    curatedCollections,
    recommendationRows,
    spotlightProducts,
    mobileQuickLinks,
    bottomNavItems,
    products
  } = homeData

  // Detect navigation to home from another page
  useEffect(() => {
    const prevPath = prevLocationRef.current
    const currentPath = location.pathname

    // If navigating to home from another page (not initial load)
    if (currentPath === '/' && prevPath !== '/' && prevPath !== '') {
      setShowLogoAnimation(true)
    }

    prevLocationRef.current = currentPath
  }, [location.pathname])

  useEffect(() => {
    const load = async () => {
      try {
        dispatch(setLoading(true))
        const backendProducts = await getProducts()
        dispatch(setHomeProducts(backendProducts))

        // Load wishlist only for logged-in users
        if (isAuthenticated && userType === 'user') {
          try {
            const wishlistItems = await getWishlist(50, 0)
            const ids = wishlistItems
              .map((item) => item.product_id || item.product_snapshot?.id)
              .filter(Boolean)
            dispatch(setHomeWishlist(ids))
          } catch (e) {
            // Silently ignore wishlist errors
          }
        } else {
          dispatch(setHomeWishlist([]))
        }

        dispatch(setLoading(false))
      } catch (err) {
        dispatch(setError(err.message || 'Failed to load products'))
        dispatch(setLoading(false))
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userType])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      {showLogoAnimation && (
        <LogoAnimation
          headerLogoRef={headerLogoRef}
          onComplete={() => setShowLogoAnimation(false)}
        />
      )}
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <CircleCategoryScroller labels={circleLabels} />
        <SpotlightSlider slides={spotlightProducts} />
        {recommendationRows.map((row) => (
          <RecommendationRow key={row.id} title={row.title} products={row.products} />
        ))}
        <ProductShowcase products={products} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}

export default Home
