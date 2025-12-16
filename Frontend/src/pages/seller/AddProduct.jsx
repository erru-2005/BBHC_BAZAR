import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiMenu } from 'react-icons/fi'
import SellerProductForm from './components/ProductForm'

function SellerAddProduct() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF3FF] via-white to-[#F4ECFF] text-slate-900">
      {/* Top header consistent with seller dashboard */}
      <header className="sticky top-0 z-20 border-b border-slate-900/80 bg-black text-white shadow-md shadow-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/seller/dashboard', { state: { openMenu: true } })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-sm shadow-black/40 transition hover:-translate-y-0.5 hover:scale-105 hover:border-white/40 hover:bg-white/10"
              aria-label="Open menu"
            >
              <FiMenu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 shadow-[0_15px_32px_rgba(0,0,0,0.3)] sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-black sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-semibold tracking-wide text-pink-500 sm:text-base">
                  Bazaar
                </span>
              </div>
              <p className="hidden text-[11px] uppercase tracking-[0.32em] text-slate-300 sm:inline">
                Seller · Add Product
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-slate-100 sm:inline sm:text-sm">
            {user?.trade_id && (
              <>
                Seller&nbsp;
                <span className="font-semibold text-white">{user.trade_id}</span>
              </>
            )}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 space-y-6 py-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Product</h1>
          <p className="text-sm text-gray-500">Create a new listing for your store.</p>
        </div>
        <SellerProductForm />
      </div>
    </div>
  )
}

export default SellerAddProduct

