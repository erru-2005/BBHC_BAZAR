import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

function CircleCategoryScroller() {
  const navigate = useNavigate()
  const { home } = useSelector((state) => state.data)
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  const wishlistProducts = useMemo(() => {
    if (!isAuthenticated || userType !== 'user') return []
    if (!home?.wishlist?.length || !home?.products?.length) return []
    const idSet = new Set(home.wishlist.map((id) => String(id)))
    return home.products.filter((p) => idSet.has(String(p.id || p._id)))
  }, [home, isAuthenticated, userType])

  // Only show wishlist section when the user is logged in and has items
  if (!isAuthenticated || userType !== 'user') {
    return null // Don't show anything if user is not logged in
  }

  if (wishlistProducts.length === 0) return null

  return (
    <section className="lg:hidden py-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold text-slate-900">Your wishlist</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {wishlistProducts.map((product) => {
          const pid = product.id || product._id
          return (
            <button
              key={pid}
              type="button"
              onClick={() => navigate(`/product/public/${pid}`, { state: { product } })}
              className="flex flex-col items-center flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail?.preview || product.thumbnail?.data_url || product.thumbnail?.url || product.thumbnail}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-[#131921] px-1 text-center line-clamp-2">
                    {product.product_name}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-700 mt-2 max-w-[72px] line-clamp-2 text-center">
                {product.product_name}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default CircleCategoryScroller

