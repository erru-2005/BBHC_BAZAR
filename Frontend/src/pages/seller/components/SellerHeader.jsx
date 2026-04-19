import { FiSearch, FiBell } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { fixImageUrl } from '../../../utils/image'

export default function SellerHeader() {
  const { user } = useSelector((state) => state.auth)

  return (
    <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/40 flex items-center justify-between px-10 sticky top-0 z-20">
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search analytics, inventory..." 
            className="w-full bg-slate-100/50 hover:bg-slate-100 border-none rounded-2xl py-3 pl-14 pr-6 text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <button className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all group">
          <FiBell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>

        <div className="h-6 w-px bg-slate-200/60 shadow-sm"></div>

        <div className="flex items-center gap-4 cursor-pointer group">
          <div className="text-right flex flex-col hidden lg:flex">
            <span className="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              {user?.trade_id || user?.name || 'Seller Account'}
            </span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-0.5 opacity-80">PRO PARTNER</span>
          </div>
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:border-blue-50">
            {user?.image_url || user?.image ? (
                <img 
                  src={fixImageUrl(user.image_url || user.image)} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 font-black font-outfit text-lg">
                  {user?.trade_id?.charAt(0).toUpperCase() || 'S'}
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
