import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import CircleCategoryScroller from './components/CircleCategoryScroller'
import SpotlightSlider from './components/SpotlightSlider'
import CategoryGrid from './components/CategoryGrid'
import CuratedCollectionsGrid from './components/CuratedCollectionsGrid'
import RecommendationRow from './components/RecommendationRow'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import ProductShowcase from './components/ProductShowcase'
import { setHomeProducts, setError, setLoading } from '../../store/dataSlice'
import { getProducts } from '../../services/api'

const circleLabels = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty']

function Home() {
  const dispatch = useDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { home, loading, error } = useSelector((state) => state.data)
  const homeData = home
  const {
    quickCategories,
    curatedCollections,
    recommendationRows,
    spotlightProducts,
    mobileQuickLinks,
    bottomNavItems,
    products
  } = homeData

  useEffect(() => {
    const loadProducts = async () => {
      try {
        dispatch(setLoading(true))
        const backendProducts = await getProducts()
        dispatch(setHomeProducts(backendProducts))
        dispatch(setLoading(false))
      } catch (err) {
        dispatch(setError(err.message || 'Failed to load products'))
        dispatch(setLoading(false))
      }
    }

    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        quickLinks={mobileQuickLinks}
        categories={quickCategories}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <CircleCategoryScroller labels={circleLabels} />
        <SpotlightSlider slides={spotlightProducts} />
        <CategoryGrid title="Shop by interest" actionLabel="View all" categories={quickCategories} />
        <CuratedCollectionsGrid collections={curatedCollections} />
        {recommendationRows.map((row) => (
          <RecommendationRow key={row.id} title={row.title} products={row.products} />
        ))}
        <ProductShowcase products={products} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}

export default Home
