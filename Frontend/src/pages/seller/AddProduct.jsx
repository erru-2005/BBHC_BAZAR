import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FiMenu } from 'react-icons/fi'
import SellerProductForm from './components/ProductForm'

function SellerAddProduct() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-[#0f172a] pointer-events-none" />

      {/* Top header consistent with seller dashboard */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl shadow-lg shadow-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-4 sm:px-4 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/seller/dashboard', { state: { openMenu: true } })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/90 shadow-sm border border-white/5 transition-transform hover:scale-105 active:scale-95 md:hidden"
              aria-label="Open menu"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3.5 py-1.5 shadow-inner ring-1 ring-white/10 backdrop-blur-sm sm:gap-1.5 sm:px-4 sm:py-2">
                <span className="text-sm font-extrabold tracking-[0.08em] text-white sm:text-base">
                  BBHC
                </span>
                <span className="text-sm font-bold text-rose-300 sm:text-base">
                  Bazaar
                </span>
              </div>
              <p className="hidden text-[11px] uppercase tracking-[0.32em] text-slate-400 sm:inline">
                Seller · Add Product
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline sm:text-sm">
            {user?.trade_id && (
              <>
                Seller&nbsp;
                <span className="font-semibold text-white">{user.trade_id}</span>
              </>
            )}
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-4 space-y-6 pt-24 mt-4 pb-24">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Add Product</h1>
          <p className="text-sm text-slate-400">Create a new listing for your store.</p>
        </div>
        <SellerProductForm />
      </div>
    </div>
  )
}

export default SellerAddProduct

