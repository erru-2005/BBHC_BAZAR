
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import {
  Home,
  PublicProductDetail,
  PhoneNumberEntry,
  OTPVerification,
  UserRegistration,
  UserProfile,
  UserOrders,
  UserOrderHistory,
  BuyNow,
  Bag,
  Seller,
  Master,
  MasterProductDetail,
  MasterSellerWalletDetail,
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
  SellerSettings,
  SellerProfilePage,
  ServiceBooking,
  UserOrderDetail
} from './pages'
import SellerLayout from './pages/seller/components/SellerLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Footer from './components/Footer'
import { useEffect, useRef } from 'react'
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
  getCurrentUser,
  bindPortalRealtimeSync,
  refreshSellerProfile,
  enableNotifications
} from './services/api'
import {
  isCacheStale,
  CACHE_TTL,
  refreshStaleMasterData,
  refreshStaleSellerData,
  refreshStaleOutletData,
  refreshStaleUserHome,
} from './services/cacheSync'
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
      // Determine which token to look for based on current path
      const path = location.pathname
      let targetRole = 'user'
      if (path.startsWith('/seller')) targetRole = 'seller'
      else if (path.startsWith('/outlet')) targetRole = 'outlet_man'
      else if (path.startsWith('/master')) targetRole = 'master'

      const roleKey = targetRole === 'user' ? 'bbhc_user_token' : `bbhc_${targetRole}_token`
      const storedToken = localStorage.getItem(roleKey) || localStorage.getItem('token')
      
      if (storedToken && !isAuthenticated) {
        try {
          // getCurrentUser in api.js is now context-aware and will use the correct token
          const data = await getCurrentUser()
          
          // STRICT ISOLATION: 
          // If we are on a path that requires a specific role, ensure the token matches that role.
          if (targetRole !== 'user' && data.userType !== targetRole) {
            console.warn(`[Session] Path ${targetRole} requires ${targetRole} role, but found ${data.userType}.`)
            return
          }
          
          // If on user path, only allow 'user' role to be restored
          const isUserPath = path === '/' || path.startsWith('/user/') || path.startsWith('/product/')
          if (isUserPath && data.userType !== 'user') {
            return
          }

          dispatch(restoreUser(data))
        } catch (err) {
          console.error('[Session] Restoration failed:', err)
        }
      } else if (storedToken && isAuthenticated && targetRole === 'seller' && userType === 'seller') {
        // Already restored from redux-persist — still soft-sync credits from server
        refreshSellerProfile(true).catch(() => {})
      }
    }
    restoreSession()
  }, [dispatch, isAuthenticated, userType, location.pathname])

  // Seller: live credit updates via socket + soft profile sync on tab focus
  useEffect(() => {
    if (!isAuthenticated || userType !== 'seller' || !token) return

    bindPortalRealtimeSync()
    refreshSellerProfile(true)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSellerProfile(false)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated, userType, token])

  // Soft re-sync stale portal data when user returns to the tab
  useEffect(() => {
    if (!isAuthenticated) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (userType === 'master') refreshStaleMasterData(dispatch)
      else if (userType === 'seller') {
        refreshSellerProfile(false)
        refreshStaleSellerData(dispatch)
      } else if (userType === 'outlet_man') refreshStaleOutletData(dispatch)
      else if (userType === 'user') refreshStaleUserHome(dispatch)
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated, userType, dispatch])

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
          // User wishlist - only if token is present
          const token = localStorage.getItem('token')
          if (token && home.wishlist.length === 0) {
            const wishlistItems = await getWishlist(200, 0)
            const ids = wishlistItems
              .map((item) => item.product_id || item.product_snapshot?.id)
              .filter(Boolean)
            dispatch(setHomeWishlist(ids))
          }
        } 
        else if (userType === 'seller') {
          const token = localStorage.getItem('token')
          const needsProducts = isCacheStale(sellerState.lastFetched.products, CACHE_TTL.seller)
          const needsOrders = isCacheStale(sellerState.lastFetched.orders, CACHE_TTL.seller)
          
          if (token && (needsProducts || needsOrders)) {
            const [products, ordersData] = await Promise.all([
              needsProducts ? getSellerMyProducts({}, { forceRefresh: needsProducts }) : Promise.resolve(sellerState.products),
              needsOrders ? getOrders({ page: 1, limit: 50 }, { forceRefresh: needsOrders }) : Promise.resolve({ orders: sellerState.orders })
            ])
            if (needsProducts) dispatch(setSellerProducts(products))
            if (needsOrders) {
              const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : [])
              dispatch(setSellerOrders(orders))
            }
          }
        }
        else if (userType === 'master') {
          const token = localStorage.getItem('token')
          const needsSellers = isCacheStale(masterState.lastFetched.sellers, CACHE_TTL.master)
          const needsMasters = isCacheStale(masterState.lastFetched.masters, CACHE_TTL.master)
          const needsOutlets = isCacheStale(masterState.lastFetched.outlets, CACHE_TTL.master)
          
          if (token && (needsSellers || needsMasters || needsOutlets)) {
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
          const token = localStorage.getItem('token')
          if (token && isCacheStale(outletState.lastFetched, CACHE_TTL.outlet)) {
            const ordersData = await getOrders({ page: 1, limit: 50 }, { forceRefresh: true })
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

  // 3. Global Singleton Socket Management + realtime portal sync
  useEffect(() => {
    let socket
    const onConnect = () => bindPortalRealtimeSync()

    const onAppNotification = (data) => {
      console.log('[Socket] App notification received:', data)
      if (window.AppNotifications) {
        window.AppNotifications.postMessage(JSON.stringify(data))
      }
    }

    if (isAuthenticated && token) {
      console.log(`[App] Initializing global socket for authenticated ${userType}`)
      socket = initSocket(token, userType)
      bindPortalRealtimeSync()
      socket.on('connect', onConnect)
      socket.on('app_notification', onAppNotification)

      // Automatically sync FCM token if running inside Flutter app shell and already present
      if (window.flutterFCMToken) {
        enableNotifications(window.flutterFCMToken).catch(err => {
          console.error('[App] Failed to auto-sync FCM token:', err)
        })
      }
    } else {
      console.log('[App] Initializing global socket as guest')
      socket = initSocket(null, 'user')
      socket.on('app_notification', onAppNotification)
    }

    // Callback listener for Flutter webview container token injection
    window.onFlutterFCMTokenReceived = (tokenVal) => {
      console.log('[App] Received FCM Token callback from Flutter container:', tokenVal)
      window.flutterFCMToken = tokenVal
      if (isAuthenticated && token) {
        enableNotifications(tokenVal).catch(err => {
          console.error('[App] Failed to auto-sync received FCM token:', err)
        })
      }
    }

    return () => {
      socket?.off('connect', onConnect)
      socket?.off('app_notification', onAppNotification)
      delete window.onFlutterFCMTokenReceived
    }
  }, [isAuthenticated, token, userType])

  return (
    <>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <main style={{ flex: 1 }}>
          <Routes>
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
                path="/user/orders/:orderId"
                element={
                  <ProtectedRoute requiredUserType="user">
                    <UserOrderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/orders/history"
                element={
                  <ProtectedRoute requiredUserType="user">
                    <UserOrderHistory />
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
              <Route path="/service/public/:serviceId" element={<ServiceDetail />} />
              <Route path="/service/:serviceId/book" element={<ServiceBooking />} />
              <Route element={<ProtectedRoute requiredUserType="seller"><SellerLayout /></ProtectedRoute>}>
                <Route path="/seller/dashboard" element={<Seller />} />
                <Route path="/seller/products" element={<SellerMyProducts />} />
                <Route path="/seller/products/new" element={<SellerAddProduct />} />
                <Route path="/seller/products/:productId" element={<SellerProductDetail />} />
                <Route path="/seller/products/:productId/edit" element={<SellerEditProduct />} />
                <Route path="/seller/services" element={<SellerMyServices />} />
                <Route path="/seller/services/new" element={<SellerAddService />} />
                <Route path="/seller/settings" element={<SellerSettings />} />
                <Route path="/seller/profile" element={<SellerProfilePage />} />
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
                path="/master/sellers/:sellerId/wallet"
                element={
                  <ProtectedRoute requiredUserType="master">
                    <MasterSellerWalletDetail />
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
        </div>
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
