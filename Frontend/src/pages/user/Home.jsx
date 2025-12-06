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
import { setHomeProducts, setHomeWishlist, setError, setLoading, setRefreshing, updateProductInCache } from '../../store/dataSlice'
import { getProducts, getWishlist } from '../../services/api'
import { initSocket, getSocket } from '../../utils/socket'

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
  const { isAuthenticated, userType, token } = useSelector((state) => state.auth)
  const homeData = home
  const {
    quickCategories,
    curatedCollections,
    recommendationRows,
    spotlightProducts,
    mobileQuickLinks,
    bottomNavItems,
    products,
    isRefreshing
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

  // Smart loading with cache - only runs when auth state changes
  useEffect(() => {
    const load = async (forceRefresh = false) => {
      const cacheTimestamp = home.productsCacheTimestamp
      const cacheMaxAge = home.productsCacheMaxAge || 5 * 60 * 1000 // 5 minutes
      const isCacheStale = !cacheTimestamp || (Date.now() - cacheTimestamp) > cacheMaxAge
      
      // If we have cached data and it's not stale, show it immediately
      if (!forceRefresh && !isCacheStale && products && products.length > 0) {
        // Data is fresh, no need to reload products
        // Optionally refresh in background if cache is getting old (> 80% of max age)
        const cacheAge = Date.now() - cacheTimestamp
        if (cacheAge > cacheMaxAge * 0.8) {
          // Background refresh - don't block UI
          dispatch(setRefreshing(true))
          try {
            const backendProducts = await getProducts()
            dispatch(setHomeProducts(backendProducts))
          } catch (err) {
            // Silently fail background refresh - keep showing cached data
            dispatch(setRefreshing(false))
          }
        }
        
        // Still load wishlist if user is authenticated (wishlist changes more frequently)
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
        }
        return
      }

      // Need to load data (cache is stale or doesn't exist)
      try {
        // Only show loading spinner if we don't have cached data
        if (!products || products.length === 0) {
          dispatch(setLoading(true))
        } else {
          // We have cached data but it's stale - refresh in background
          dispatch(setRefreshing(true))
        }
        
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
        dispatch(setRefreshing(false))
      } catch (err) {
        dispatch(setError(err.message || 'Failed to load products'))
        dispatch(setLoading(false))
        dispatch(setRefreshing(false))
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userType])

  // Handle navigation back to home - check cache freshness
  useEffect(() => {
    // Only check cache when navigating to home (not on initial mount)
    if (location.pathname !== '/') return
    
    const cacheTimestamp = home.productsCacheTimestamp
    const cacheMaxAge = home.productsCacheMaxAge || 5 * 60 * 1000
    const isCacheStale = !cacheTimestamp || (Date.now() - cacheTimestamp) > cacheMaxAge
    
    // If cache exists and is fresh, no action needed (data already shown)
    // If cache is stale, trigger background refresh
    if (products && products.length > 0 && isCacheStale) {
      const refresh = async () => {
        dispatch(setRefreshing(true))
        try {
          const backendProducts = await getProducts()
          dispatch(setHomeProducts(backendProducts))
        } catch (err) {
          dispatch(setRefreshing(false))
        }
      }
      refresh()
    }
  }, [location.pathname, home.productsCacheTimestamp, home.productsCacheMaxAge, products, dispatch, home])

  // Listen for real-time product updates via socket
  useEffect(() => {
    let socket = getSocket()
    
    if (!socket || !socket.connected) {
      socket = initSocket(token)
    }
    
    if (!socket) return

    const handleProductUpdate = (updatedProduct) => {
      if (updatedProduct && updatedProduct.id) {
        dispatch(updateProductInCache(updatedProduct))
      }
    }

    const handleProductCreated = (newProduct) => {
      if (newProduct && newProduct.id) {
        // Add new product to cache if it doesn't exist
        const currentProducts = home.products || []
        const exists = currentProducts.some(
          (p) => String(p.id || p._id) === String(newProduct.id || newProduct._id)
        )
        if (!exists) {
          dispatch(setHomeProducts([newProduct, ...currentProducts]))
        }
      }
    }

    // Listen for rating updates to refresh product ratings in cache
    const handleRatingUpdate = (data) => {
      if (data && data.product_id && data.rating_stats) {
        const productId = String(data.product_id)
        const currentProducts = home.products || []
        const updatedProducts = currentProducts.map((p) => {
          if (String(p.id || p._id) === productId) {
            return {
              ...p,
              rating: data.rating_stats.average_rating,
              total_ratings: data.rating_stats.total_ratings
            }
          }
          return p
        })
        if (updatedProducts !== currentProducts) {
          dispatch(setHomeProducts(updatedProducts))
        }
      }
    }

    socket.on('product_updated', handleProductUpdate)
    socket.on('product_created', handleProductCreated)
    socket.on('rating_updated', handleRatingUpdate)

    return () => {
      if (socket) {
        socket.off('product_updated', handleProductUpdate)
        socket.off('product_created', handleProductCreated)
        socket.off('rating_updated', handleRatingUpdate)
      }
    }
  }, [token, dispatch, home.products])

  // Initialize socket connection for real-time updates
  useEffect(() => {
    initSocket(token)
  }, [token])

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
