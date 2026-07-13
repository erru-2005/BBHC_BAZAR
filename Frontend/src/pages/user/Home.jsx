import { useEffect, useState, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SpotlightSlider from './components/SpotlightSlider'
import CategoryGrid from './components/CategoryGrid'
import CuratedCollectionsGrid from './components/CuratedCollectionsGrid'
import RecommendationRow from './components/RecommendationRow'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import ProductShowcase from './components/ProductShowcase'
import RecentReviews from './components/RecentReviews'
import LogoAnimation from '../../components/LogoAnimation'
import { setHomeProducts, setHomeServices, setHomeWishlist, setError, setLoading, setRefreshing, updateProductInCache } from '../../store/dataSlice'
import { getProducts, getWishlist, getServices, getAdvertisements } from '../../services/api'
import { getImageUrl } from '../../utils/image'
import { initSocket, getSocket } from '../../utils/socket'
import { initActiveCounterSocket } from '../../utils/activeCounterSocket'


function Home({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoAnimation, setShowLogoAnimation] = useState(false)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef
  const prevLocationRef = useRef(location.pathname)
  const [advertisements, setAdvertisements] = useState([])

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const ads = await getAdvertisements()
        setAdvertisements(ads)
      } catch (err) {
        console.error('Failed to fetch advertisements:', err)
      }
    }
    fetchAds()
  }, [])

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
    services,
    isRefreshing
  } = homeData

  // Build dynamic spotlight slides from both products and services marked as spotlight
  const combinedSpotlightSlides = useMemo(() => {
    const slides = []

    // Add product spotlights
    if (products && products.length > 0) {
      const spotlighted = products.filter((p) => p.is_spotlight)
      slides.push(...spotlighted.map((p) => ({
        id: `prod-${p.id || p._id}`,
        title: p.product_name || p.productName || 'Featured Product',
        subtitle: p.selling_price ? `₹${Number(p.selling_price).toLocaleString('en-IN')}` : 'Shop Now',
        cta: 'View Product',
        link: `/product/public/${p.id || p._id}`,
        image: getImageUrl(p.thumbnail)
      })))
    }

    // Add service spotlights
    if (services && services.length > 0) {
      const spotlighted = services.filter((s) => s.is_spotlight)
      slides.push(...spotlighted.map((s) => ({
        id: `serv-${s.id || s._id}`,
        title: s.service_name || 'Featured Service',
        subtitle: s.service_charge ? `₹${Number(s.service_charge).toLocaleString('en-IN')}` : 'Book Now',
        cta: 'View Service',
        link: `/service/public/${s.id || s._id}`,
        image: getImageUrl(s.thumbnail)
      })))
    }

    // Add custom advertisements
    if (advertisements && advertisements.length > 0) {
      slides.push(...advertisements.map((ad) => ({
        id: `ad-${ad.id || ad._id}`,
        title: ad.title || '',
        subtitle: '',
        cta: 'View',
        link: ad.link,
        image: ad.media_url,
        media_type: ad.media_type
      })))
    }

    // Fallback to static slides if no dynamic spotlights exist
    if (slides.length === 0) {
      return spotlightProducts
    }

    return slides
  }, [products, services, spotlightProducts, advertisements])

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
      if (!forceRefresh && !isCacheStale && products && products.length > 0 && services && services.length > 0) {
        // Data is fresh, no need to reload products
        // Optionally refresh in background if cache is getting old (> 80% of max age)
        const cacheAge = Date.now() - cacheTimestamp
        if (cacheAge > cacheMaxAge * 0.8) {
          // Background refresh - don't block UI
          dispatch(setRefreshing(true))
          try {
            const [backendProducts, backendServices] = await Promise.all([
              getProducts(),
              getServices()
            ])
            dispatch(setHomeProducts(backendProducts))
            dispatch(setHomeServices(backendServices))
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

        const [backendProducts, backendServices] = await Promise.all([
          getProducts(),
          getServices()
        ])

        dispatch(setHomeProducts(backendProducts))
        dispatch(setHomeServices(backendServices))

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
        console.error('Home load error:', err)
        // Differentiate between auth errors and connectivity issues
        const isAuthError = err.message?.toLowerCase().includes('authorization') ||
          err.message?.toLowerCase().includes('login') ||
          err.message?.toLowerCase().includes('401')

        if (isAuthError) {
          // If it's an auth error but we thought we were authenticated, 
          // it just means the session is invalid. We can stay on home as a guest.
          dispatch(setHomeWishlist([]))
          // Don't show a scary red error box for background wishlist failures
        } else {
          dispatch(setError(err.message || 'Failed to load products. Please check your connection.'))
        }
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
    if (products && products.length > 0 && services && services.length > 0 && isCacheStale) {
      const refresh = async () => {
        dispatch(setRefreshing(true))
        try {
          const [backendProducts, backendServices] = await Promise.all([
            getProducts(),
            getServices()
          ])
          dispatch(setHomeProducts(backendProducts))
          dispatch(setHomeServices(backendServices))
        } catch (err) {
          dispatch(setRefreshing(false))
        }
      }
      refresh()
    }
  }, [location.pathname, home.productsCacheTimestamp, home.productsCacheMaxAge, products, dispatch, home])

  // Listen for real-time product updates via socket
  useEffect(() => {
    const socket = getSocket()

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
    socket.on('product_approved', handleProductCreated)
    socket.on('rating_updated', handleRatingUpdate)

    return () => {
      if (socket) {
        socket.off('product_updated', handleProductUpdate)
        socket.off('product_created', handleProductCreated)
        socket.off('product_approved', handleProductCreated)
        socket.off('rating_updated', handleRatingUpdate)
      }
    }
  }, [token, dispatch, home.products])

  // Track home visits via global singleton socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !token) return

    // Emit visit event
    socket.emit('user:visit-home', {
      timestamp: new Date().toISOString(),
      hasAuth: !!token
    })

    return () => {
      // Emit leave event when component unmounts
      socket.emit('user:leave-home', {
        timestamp: new Date().toISOString()
      })
    }
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

      <main className="pt-4 pb-20 lg:pt-4 lg:pb-0 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 space-y-8 md:space-y-12 pb-12">

          {/* Spotlight Banner - Full width with rounded corners */}
          <div className="w-full">

            <SpotlightSlider slides={combinedSpotlightSlides} />
          </div>

          {recommendationRows.map((row) => (
            <RecommendationRow key={row.id} title={row.title} products={row.products} />
          ))}
          <ProductShowcase products={products} services={services} loading={loading} error={error} />
          <RecentReviews />
        </div>
      </main>

      <SiteFooter />
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}

export default Home
