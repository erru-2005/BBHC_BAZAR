
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
import { useEffect, useState } from 'react'

// Inner component to use router hooks
function SplashWrapper() {
  const location = useLocation()
  const [showSplash, setShowSplash] = useState(location.pathname === '/')

  useEffect(() => {
    if (location.pathname === '/') {
      setShowSplash(true)
    } else {
      setShowSplash(false)
    }
  }, [location.pathname])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
