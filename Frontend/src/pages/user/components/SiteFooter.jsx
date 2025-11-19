function SiteFooter() {
  return (
    <footer className="mt-12 bg-[#131921] text-gray-200 py-10 w-full">
      <div className="w-full px-4 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-bold text-white mb-3">Get to know BBHCBazaar</h4>
          <ul className="space-y-2 text-gray-300">
            <li>About BBHC</li>
            <li>Community creators</li>
            <li>Press & stories</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">Make money with us</h4>
          <ul className="space-y-2 text-gray-300">
            <li>Sell with BBHC</li>
            <li>Creator marketplace</li>
            <li>Collaborations & bulk</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">Customer support</h4>
          <ul className="space-y-2 text-gray-300">
            <li>Your account</li>
            <li>Returns centre</li>
            <li>Privacy & policies</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">Stay updated</h4>
          <p className="text-sm text-gray-300 mb-3">Subscribe to receive curated collections and BBHC studio launches.</p>
          <div className="flex bg-white rounded-md overflow-hidden">
            <input className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Email address" />
            <button className="px-4 bg-amber-500 text-sm font-semibold text-slate-900">Join</button>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">
        © {new Date().getFullYear()} BBHCBazaar. Inspired by marketplace experiences loved by communities worldwide.
      </p>
    </footer>
  )
}

export default SiteFooter


