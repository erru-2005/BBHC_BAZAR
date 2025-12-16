import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MainHeader from './components/MainHeader'
import MobileMenu from './components/MobileMenu'
import MobileSearchBar from './components/MobileSearchBar'
import ProductShowcase from './components/ProductShowcase'
import SiteFooter from './components/SiteFooter'
import MobileBottomNav from './components/MobileBottomNav'
import { getCategories, getProducts } from '../../services/api'

// Page to show products for a selected category with the same header/footer shell
function CategoryProducts({ headerLogoRef: externalHeaderLogoRef }) {
  const { categoryId } = useParams()
  const location = useLocation()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const internalHeaderLogoRef = useRef(null)
  const headerLogoRef = externalHeaderLogoRef || internalHeaderLogoRef

  const { home } = useSelector((state) => state.data)

  // Resolve category display data
  const selectedCategory = useMemo(() => {
    if (!categoryId) return null
    const match = categories.find(
      (cat) =>
        String(cat.id || cat._id) === String(categoryId) ||
        (cat.name && cat.name.toLowerCase() === decodeURIComponent(categoryId).toLowerCase())
    )
    if (match) return match
    if (location.state?.categoryName) {
      return {
        id: categoryId,
        name: location.state.categoryName
      }
    }
    return null
  }, [categories, categoryId, location.state])

  // Load categories and products (reuse cached home products when available)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          getCategories().catch(() => []),
          home?.products?.length ? Promise.resolve(home.products) : getProducts()
        ])
        setCategories(fetchedCategories || [])
        setProducts(fetchedProducts || [])
      } catch (err) {
        setError(err.message || 'Failed to load category')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [home?.products, categoryId])

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!categoryId || !products?.length) return []
    const targetId = String(categoryId).toLowerCase()
    const targetName = (selectedCategory?.name || decodeURIComponent(categoryId)).toLowerCase()

    return products.filter((product) => {
      const cats = Array.isArray(product.categories) ? product.categories : []
      return cats.some((cat) => {
        if (typeof cat === 'string') {
          const value = cat.toLowerCase()
          return value === targetName || value.includes(targetName)
        }
        const catId = String(cat.id || cat._id || '').toLowerCase()
        const catName = (cat.name || cat.title || '').toLowerCase()
        return catId === targetId || (catName && (catName === targetName || catName.includes(targetName)))
      })
    })
  }, [categoryId, products, selectedCategory])

  const pageTitle = selectedCategory?.name || decodeURIComponent(categoryId || '').replace(/-/g, ' ') || 'Category'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      <MainHeader ref={headerLogoRef} onOpenMenu={() => setMobileMenuOpen(true)}>
        <MobileSearchBar />
      </MainHeader>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{pageTitle}</h1>
          </div>
        </div>

        <ProductShowcase products={filteredProducts} loading={loading} error={error} />
      </main>

      <SiteFooter />
      <MobileBottomNav items={home?.bottomNavItems || []} />
    </div>
  )
}

export default CategoryProducts


