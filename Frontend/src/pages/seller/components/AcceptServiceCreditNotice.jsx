/**
 * Shared credit display for the Accept Service confirmation modal.
 * Amount comes from master Service Credits settings (per category or default).
 */
export function AcceptServiceCreditBadge({ balance = 0 }) {
  return (
    <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-100 shadow-sm">
      <span>Available Balance:</span>
      <span className="text-base text-blue-700 tabular-nums leading-none">{balance}</span>
    </div>
  )
}

export function AcceptServiceCreditDeduction({ amount = 0, loading = false }) {
  return (
    <span className="block mt-3 font-black uppercase tracking-widest bg-blue-50 py-3 px-4 rounded-xl border border-blue-100">
      {loading ? (
        <span className="text-[11px] text-blue-400 animate-pulse normal-case tracking-normal font-semibold">
          Loading credit cost…
        </span>
      ) : (
        <>
          <span className="inline-flex items-baseline justify-center gap-2">
            <span className="text-3xl text-blue-700 tabular-nums leading-none">{amount}</span>
            <span className="text-[11px] text-blue-600">Credits</span>
          </span>
          <span className="block mt-1.5 text-[10px] font-bold text-blue-500 tracking-[0.2em]">
            Will Be Deducted
          </span>
        </>
      )}
    </span>
  )
}

export function getServiceCategoryFromOrder(order) {
  const product = order?.product || order?.product_snapshot || {}
  const categories = product?.categories
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0]
  }
  return null
}
