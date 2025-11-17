import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import HeroBanner from './components/HeroBanner'
import MobileSearchBar from './components/MobileSearchBar'
import CircleCategoryScroller from './components/CircleCategoryScroller'
import SpotlightSlider from './components/SpotlightSlider'
import CategoryGrid from './components/CategoryGrid'
import CuratedCollectionsGrid from './components/CuratedCollectionsGrid'
import RecommendationRow from './components/RecommendationRow'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'

const circleLabels = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty']

function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }).format(new Date()),
    []
  )

  const homeData = useSelector((state) => state.data.home)
  const {
    heroSlides,
    quickCategories,
    curatedCollections,
    recommendationRows,
    spotlightProducts,
    mobileQuickLinks,
    bottomNavItems
  } = homeData

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
        <HeroBanner slide={heroSlides[0]} updatedText={today} />
        <CircleCategoryScroller labels={circleLabels} />
        <SpotlightSlider slides={spotlightProducts} />
        <CategoryGrid title="Shop by interest" actionLabel="View all" categories={quickCategories} />
        <CuratedCollectionsGrid collections={curatedCollections} />
        {recommendationRows.map((row) => (
          <RecommendationRow key={row.id} title={row.title} products={row.products} />
        ))}
      </main>

      <SiteFooter />
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}

export default Home
