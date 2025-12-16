import { useState, useRef } from 'react'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { useSelector } from 'react-redux'

function Services({ headerLogoRef: externalHeaderLogoRef }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef
  const { home } = useSelector((state) => state.data)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-3xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <div className="py-10 text-center space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-gray-600 text-sm">
            No services are available right now. We&apos;ll add them here in the future.
          </p>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || undefined} />
    </div>
  )
}

export default Services


