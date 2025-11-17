
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home, ProductDetail, Seller, Master, SellerLogin, MasterLogin, NotFound } from './pages'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/master/login" element={<MasterLogin />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
