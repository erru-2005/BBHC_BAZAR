import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import ProductShowcase from './components/ProductShowcase'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getProducts, getWishlist } from '../../services/api'
import { setHomeProducts, setHomeWishlist } from '../../store/dataSlice'
import { useDispatch } from 'react-redux'

function AllProducts({ headerLogoRef: externalHeaderLogoRef }) {
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef

  const { data } = useSelector((state) => state)
  const home = data.home
  const globalLoading = data.loading
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const products = useMemo(() => home?.products || [], [home])

  useEffect(() => {
    // If we have products, we're not loading. 
    // If we don't, we wait for the global loading from App.jsx
    if (products.length > 0) {
      setLoading(false)
    } else {
      setLoading(globalLoading)
    }
  }, [products.length, globalLoading])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <ProductShowcase products={products} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || undefined} />
    </div>
  )
}

export default AllProducts


