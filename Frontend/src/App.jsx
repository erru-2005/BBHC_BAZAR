
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Home, PublicProductDetail, Seller, Master, MasterProductDetail, SellerLogin, MasterLogin, NotFound } from './pages'
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
