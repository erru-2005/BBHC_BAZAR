
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import {
  Home,
  PublicProductDetail,
  PhoneNumberEntry,
  OTPVerification,
  UserRegistration,
  UserProfile,
  UserOrders,
  Seller,
  Master,
  MasterProductDetail,
  SellerLogin,
  MasterLogin,
  NotFound,
  SellerMyProducts,
  SellerProductDetail,
  SellerAddProduct,
  SellerEditProduct
} from './pages'
import ProtectedRoute from './components/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import { useEffect, useState, useRef } from 'react'

// Inner component to use router hooks
function SplashWrapper() {
  const location = useLocation()
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on initial load to home page
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash')
    return location.pathname === '/' && !hasSeenSplash
  })
  const [showContent, setShowContent] = useState(!showSplash)
  const headerLogoRef = useRef(null)
  
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
        <div style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 0.3s', pointerEvents: showSplash ? 'none' : 'auto' }}>
          <Routes>
            <Route path="/" element={<Home headerLogoRef={headerLogoRef} />} />
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
      <Route path="/seller/login" element={<SellerLogin />} />
      <Route path="/master/login" element={<MasterLogin />} />
      <Route path="/product/:productId" element={<PublicProductDetail />} />
      <Route path="/product/public/:productId" element={<PublicProductDetail />} />
      <Route 
        path="/seller" 
        element={
          <ProtectedRoute requiredUserType="seller">
            <Seller />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/seller/products" 
        element={
          <ProtectedRoute requiredUserType="seller">
            <SellerMyProducts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/seller/products/new" 
        element={
          <ProtectedRoute requiredUserType="seller">
            <SellerAddProduct />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/seller/products/:productId" 
        element={
          <ProtectedRoute requiredUserType="seller">
            <SellerProductDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/seller/products/:productId/edit" 
        element={
          <ProtectedRoute requiredUserType="seller">
            <SellerEditProduct />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/master" 
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
            <Route path="*" element={<NotFound />} />
          </Routes>
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
