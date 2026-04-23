
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import {
  Home,
  PublicProductDetail,
  PhoneNumberEntry,
  OTPVerification,
  UserRegistration,
  UserProfile,
  UserOrders,
  BuyNow,
  Bag,
  Seller,
  Master,
  MasterProductDetail,
  SellerLogin,
  MasterLogin,
  OutletLogin,
  Outlet,
  CategoryProducts,
  AllProducts,
  Services,
  ServiceDetail,
  Wishlist,
  SearchResults,
  NotFound,
  SellerMyProducts,
  SellerProductDetail,
  SellerAddProduct,
  SellerEditProduct,
  SellerMyServices,
  SellerAddService,
  SellerSettings
} from './pages'
import SellerLayout from './pages/seller/components/SellerLayout'
import ProtectedRoute from './components/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import Footer from './components/Footer'
import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setHomeProducts, setHomeWishlist, setCategories, setLoading } from './store/dataSlice'
import { setSellerProducts, setSellerOrders } from './store/sellerSlice'
import { setMastersData } from './store/masterSlice'
import { setOutletOrders } from './store/outletSlice'
import { 
  getProducts, 
  getWishlist, 
  getCategories, 
  getSellerMyProducts, 
  getOrders,
  getSellers,
  getMasters,
  getOutletMen,
  getCurrentUser
} from './services/api'
import { restoreUser } from './store/authSlice'
import { initSocket, disconnectSocket } from './utils/socket'

function SplashWrapper() {
  const location = useLocation()
  const dispatch = useDispatch()
  const { isAuthenticated, userType, token } = useSelector((state) => state.auth)
  const { isDarkMode } = useSelector((state) => state.theme)
  const { home } = useSelector((state) => state.data)
  const sellerState = useSelector((state) => state.seller)
  const masterState = useSelector((state) => state.master)
  const outletState = useSelector((state) => state.outlet)

  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on initial load to home page
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash')
    return location.pathname === '/' && !hasSeenSplash
  })
  const [showContent, setShowContent] = useState(!showSplash)
  const headerLogoRef = useRef(null)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // 0. Session Restoration on Mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken && !isAuthenticated) {
        try {
          // Verify token and get user profile
          const data = await getCurrentUser()
          
          // ROLE ISOLATION: 
          // If we are on a customer-facing path (User side), and the found token is NOT a 'user' token,
          // we should NOT automatically restore it as the primary authenticated user for the consumer site.
          // This prevents "Seller cache" from being used as "User data".
          const isUserPath = location.pathname.startsWith('/user/') || 
                            location.pathname === '/' || 
                            location.pathname.startsWith('/product/') ||
                            location.pathname.startsWith('/category/')
          
          if (isUserPath && data.userType !== 'user') {
            console.warn('[Session] Ignoring merchant/admin token for consumer flow isolation.')
            return
          }

          dispatch(restoreUser(data))
        } catch (err) {
          console.error('[Session] Restoration failed:', err)
        }
      }
    }
    restoreSession()
  }, [dispatch, isAuthenticated, location.pathname])

  // 1. Initial data loading - handles all roles
  useEffect(() => {
    const initData = async () => {
      // 1. Always fetch public home data if missing
      const hasProducts = home?.products?.length > 0
      const hasCategories = home?.categories?.length > 0
      
      if (!hasProducts || !hasCategories) {
        try {
          const [products, categories] = await Promise.all([
            hasProducts ? Promise.resolve(home.products) : getProducts(),
            hasCategories ? Promise.resolve(home.categories) : getCategories().catch(() => [])
          ])
          
          if (!hasProducts) dispatch(setHomeProducts(products))
          if (!hasCategories) dispatch(setCategories(categories))
        } catch (err) {
          console.error('Failed to pre-fetch public data:', err)
        }
      }

      // 2. Role-specific data fetching
      if (!isAuthenticated) return

      try {
        if (userType === 'user') {
          // User wishlist
          if (home.wishlist.length === 0) {
            const wishlistItems = await getWishlist(200, 0)
            const ids = wishlistItems
              .map((item) => item.product_id || item.product_snapshot?.id)
              .filter(Boolean)
            dispatch(setHomeWishlist(ids))
          }
        } 
        else if (userType === 'seller') {
          // Seller products and orders
          const needsProducts = !sellerState.lastFetched.products
          const needsOrders = !sellerState.lastFetched.orders
          
          if (needsProducts || needsOrders) {
            const [products, ordersData] = await Promise.all([
              needsProducts ? getSellerMyProducts() : Promise.resolve(sellerState.products),
              needsOrders ? getOrders() : Promise.resolve(sellerState.orders)
            ])
            if (needsProducts) dispatch(setSellerProducts(products))
            if (needsOrders) {
              const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : [])
              dispatch(setSellerOrders(orders))
            }
          }
        }
        else if (userType === 'master') {
          // Master essential lists
          const needsSellers = !masterState.lastFetched.sellers
          const needsMasters = !masterState.lastFetched.masters
          const needsOutlets = !masterState.lastFetched.outlets
          
          if (needsSellers || needsMasters || needsOutlets) {
            const [sellersData, masters, outletsData] = await Promise.all([
              needsSellers ? getSellers({ limit: 100 }) : Promise.resolve({ sellers: masterState.sellers }),
              needsMasters ? getMasters() : Promise.resolve(masterState.masters),
              needsOutlets ? getOutletMen() : Promise.resolve({ outlet_men: masterState.outlets })
            ])
            
            if (needsSellers) dispatch(setMastersData({ field: 'sellers', data: sellersData.sellers || [] }))
            if (needsMasters) dispatch(setMastersData({ field: 'masters', data: masters || [] }))
            if (needsOutlets) dispatch(setMastersData({ field: 'outlets', data: outletsData.outlet_men || [] }))
          }
        }
        else if (userType === 'outlet_man') {
          // Outlet orders
          if (!outletState.lastFetched) {
            const ordersData = await getOrders()
            const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : [])
            dispatch(setOutletOrders(orders))
          }
        }
      } catch (err) {
        console.error(`Failed to pre-fetch ${userType} data:`, err)
      }
    }

    initData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userType])

  // 3. Global Singleton Socket Management
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log(`[App] Initializing global socket for authenticated ${userType}`)
      initSocket(token, userType)
    } else {
      console.log('[App] Initializing global socket as guest')
      // Guest connection - allows real-time updates for public data (active counts, etc.)
      initSocket(null, 'user')
    }
  }, [isAuthenticated, token, userType])

  useEffect(() => {
    if (location.pathname === '/') {
      const hasSeenSplash = sessionStorage.getItem('hasSeenSplash')
      if (!hasSeenSplash) {
        setShowSplash(true)
        setShowContent(true) // Render content but keep it hidden
      } else {
        setShowSplash(false)
        setShowContent(true)
      }
    } else {
      setShowSplash(false)
      setShowContent(true)
    }
  }, [location.pathname])

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true')
    setShowSplash(false)
  }

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={handleSplashComplete}
          headerLogoRef={headerLogoRef}
        />
      )}
      {showContent && (
        <div style={{ 
          opacity: showSplash ? 0 : 1, 
          transition: 'opacity 0.3s', 
          pointerEvents: showSplash ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}>
          <main style={{ flex: 1 }}>
            <Routes>
              {/* ... existing routes ... */}
              <Route path="/" element={<Home headerLogoRef={headerLogoRef} />} />
              <Route path="/category/:categoryId" element={<CategoryProducts headerLogoRef={headerLogoRef} />} />
              <Route path="/products" element={<AllProducts headerLogoRef={headerLogoRef} />} />
              <Route path="/services" element={<Services headerLogoRef={headerLogoRef} />} />
              <Route path="/wishlist" element={<Wishlist headerLogoRef={headerLogoRef} />} />
              <Route path="/search" element={<SearchResults headerLogoRef={headerLogoRef} />} />
              <Route path="/user/phone-entry" element={<PhoneNumberEntry />} />
              <Route path="/user/verify-otp" element={<OTPVerification />} />
              <Route path="/user/register" element={<UserRegistration />} />
              <Route
                path="/user/profile"
                element={
                  <ProtectedRoute requiredUserType="user">
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/orders"
                element={
                  <ProtectedRoute requiredUserType="user">
                    <UserOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/bag"
                element={
                  <ProtectedRoute requiredUserType="user">
                    <Bag />
                  </ProtectedRoute>
                }
              />
              <Route path="/seller/login" element={<SellerLogin />} />
              <Route path="/master/login" element={<MasterLogin />} />
              <Route path="/outlet/login" element={<OutletLogin />} />
              <Route path="/outlet" element={<Navigate to="/outlet/login" replace />} />
              <Route path="/seller" element={<Navigate to="/seller/login" replace />} />
              <Route path="/master" element={<Navigate to="/master/login" replace />} />
              <Route path="/product/:productId" element={<PublicProductDetail />} />
              <Route path="/product/public/:productId" element={<PublicProductDetail />} />
              <Route path="/product/:productId/buy" element={<BuyNow />} />
              <Route path="/service/:serviceId" element={<ServiceDetail />} />
              <Route element={<ProtectedRoute requiredUserType="seller"><SellerLayout /></ProtectedRoute>}>
                <Route path="/seller/dashboard" element={<Seller />} />
                <Route path="/seller/products" element={<SellerMyProducts />} />
                <Route path="/seller/products/new" element={<SellerAddProduct />} />
                <Route path="/seller/products/:productId" element={<SellerProductDetail />} />
                <Route path="/seller/products/:productId/edit" element={<SellerEditProduct />} />
                <Route path="/seller/services" element={<SellerMyServices />} />
                <Route path="/seller/services/new" element={<SellerAddService />} />
                <Route path="/seller/settings" element={<SellerSettings />} />
              </Route>
              <Route
                path="/master/dashboard"
                element={
                  <ProtectedRoute requiredUserType="master">
                    <Master />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/master/products/:productId"
                element={
                  <ProtectedRoute requiredUserType="master">
                    <MasterProductDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/outlet/dashboard"
                element={
                  <ProtectedRoute requiredUserType="outlet_man">
                    <Outlet />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <SplashWrapper />
    </BrowserRouter>
  )
}

export default App
