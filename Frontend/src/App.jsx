import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home, Seller, Master, NotFound } from './pages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/seller" element={<Seller />} />
        <Route path="/master" element={<Master />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
