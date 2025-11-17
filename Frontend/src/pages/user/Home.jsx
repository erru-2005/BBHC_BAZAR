import { useMemo, useState } from 'react'

const heroSlides = [
  {
    id: 'slide-1',
    eyebrow: 'Festival Specials',
    title: 'BBHC Bazaar Mega Sale',
    subtitle: 'Exclusive collections across decor, food essentials, gadgets and more.',
    cta: 'Shop curated picks',
    image:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1500&q=80',
    accent: 'from-rose-500/90 to-orange-400/80',
  },
  {
    id: 'slide-2',
    eyebrow: 'Work • Play • Repeat',
    title: 'Cozy corners & creator desks',
    subtitle: 'Ergonomic furniture, ambient lighting and desk essentials built for flow.',
    cta: 'Build your setup',
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1500&q=80',
    accent: 'from-blue-600/80 to-sky-400/70',
  },
  {
    id: 'slide-3',
    eyebrow: 'Kitchen Lab',
    title: 'Smart cookware brings flavour & precision',
    subtitle: 'Top-rated appliances picked by chefs across BBHC community households.',
    cta: 'Cook with confidence',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1500&q=80',
    accent: 'from-emerald-500/80 to-lime-400/70',
  },
]

const quickCategories = [
  { label: 'Home & Decor', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=400&q=60' },
  { label: 'Gourmet & Grocery', image: 'https://images.unsplash.com/photo-1441123285228-1448e608f3d5?auto=format&fit=crop&w=400&q=60' },
  { label: 'Electronics', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=60' },
  { label: 'Kids & Baby', image: 'https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=400&q=60' },
  { label: 'Books & Stationery', image: 'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=400&q=60' },
  { label: 'Fashion & Essentials', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=60' },
]

const curatedCollections = [
  {
    title: 'Kid Studio',
    tagline: 'Play tables • learning corners • bedtime comfort',
    image:
      'https://images.unsplash.com/photo-1504610926078-a1611febcad3?auto=format&fit=crop&w=900&q=80',
    link: 'Explore kid studio',
  },
  {
    title: 'Designer corners',
    tagline: 'Statement pieces from boutique creators on BBHC bazaar',
    image:
      'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=900&q=80',
    link: 'Meet the designers',
  },
  {
    title: 'Fresh & fit pantry',
    tagline: 'Cold-pressed oils, millet mixes and superfood jars',
    image:
      'https://images.unsplash.com/photo-1457433575995-8407028a9970?auto=format&fit=crop&w=900&q=80',
    link: 'Stock your shelf',
  },
]

const recommendationRows = [
  {
    title: 'Inspired by your browsing',
    products: [
      { name: 'Modular study nook', price: '₹7,499', image: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=500&q=60' },
      { name: 'Mindful diary set', price: '₹749', image: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=500&q=60' },
      { name: 'Tabletop planter duo', price: '₹999', image: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=500&q=60' },
      { name: 'Heritage chai kit', price: '₹549', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=500&q=60' },
      { name: 'Smart kettle', price: '₹2,799', image: 'https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?auto=format&fit=crop&w=500&q=60' },
    ],
  },
  {
    title: 'Top picks near you',
    products: [
      { name: 'Artisan lamp', price: '₹1,899', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=60' },
      { name: 'Sustainable tote', price: '₹599', image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=60' },
      { name: 'Fitness smart band', price: '₹3,299', image: 'https://images.unsplash.com/photo-1421757350652-9f65a35effc7?auto=format&fit=crop&w=500&q=60' },
      { name: 'BBHC shield masks', price: '₹299', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=60' },
      { name: 'Gourmet spice rack', price: '₹1,249', image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=500&q=60' },
    ],
  },
]

const mobileQuickLinks = [
  { label: 'Profile', icon: '👤' },
  { label: 'Services', icon: '🛠️' },
  { label: 'Products', icon: '🛍️' },
  { label: 'Wishlist', icon: '❤️' },
  { label: 'Bag', icon: '🛒' },
]

const bottomNavItems = [
  { label: 'Home', icon: '🏠' },
  { label: 'Categories', icon: '🗂️' },
  { label: 'Deals', icon: '⚡' },
  { label: 'Cart', icon: '🛒' },
  { label: 'Account', icon: '👤' },
]

const spotlightProducts = [
  {
    title: 'Women\'s clothing',
    subtitle: 'Under ₹499',
    cta: 'See Libas & Varanga picks',
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Sunglasses & frames',
    subtitle: 'Under ₹499',
    cta: 'Vincent Chase, Fastrack & more',
    image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Footwear essentials',
    subtitle: 'Starting ₹699',
    cta: 'Campus, Bata and more',
    image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80',
  },
]

function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    []
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-gray-900">
      {/* Global Navigation */}
      <header className="bg-[#131921] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-2xl"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              <div className="bg-white text-[#131921] font-black tracking-tight text-xl px-3 py-1 rounded-sm shadow">
                BBHC<span className="text-pink-500">Bazaar</span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs text-gray-300">Delivering to</span>
                <span className="font-semibold">BBHC Smart Campus 560001</span>
              </div>
            </div>

            <div className="flex-1 hidden md:block">
              <div className="flex bg-white rounded-md overflow-hidden shadow-inner">
                <select className="bg-gray-100 text-sm text-gray-700 px-3 border-r border-gray-200 outline-none">
                  <option>All</option>
                  <option>Home</option>
                  <option>Electronics</option>
                  <option>BBHC Organic</option>
                </select>
                <input
                  type="text"
                  placeholder="Search BBHC Bazaar"
                  className="flex-1 px-4 py-2 text-gray-800 outline-none"
                />
                <button className="px-4 bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold">
                  Search
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm font-medium">
              <button className="hidden sm:block hover:text-amber-300 transition">Sign in</button>
              <button className="hidden sm:block hover:text-amber-300 transition">Orders</button>
              <button className="flex items-center gap-2 hover:text-amber-300 transition">
                <span>Cart</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 2a1 1 0 00-1 1v1H3a1 1 0 000 2h1l1 9h10l1-9h1a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 2h4v1H8V4z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-200 py-2 overflow-x-auto scrollbar-hide">
            {['Home', 'Fresh Finds', 'Deals', 'Stores', 'Electronics', 'Fashion', 'Books', 'BBHC Smart Living', 'Customer Care'].map((item) => (
              <button key={item} className="hover:text-white whitespace-nowrap">
                {item}
              </button>
            ))}
          </div>

          {/* Mobile search + location */}
          <div className="md:hidden space-y-3 pb-4">
            <div className="flex bg-white rounded-full overflow-hidden shadow-inner">
              <button className="px-3 text-gray-500 border-r border-gray-200 text-sm">All</button>
              <input
                type="text"
                placeholder="Search BBHC Bazaar"
                className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none"
              />
              <button className="px-4 bg-amber-400 text-gray-900 font-semibold text-sm">Search</button>
            </div>
            <button className="flex items-center gap-2 text-xs text-gray-200">
              <span>📍</span>
              Delivering to BBHC Smart Campus • Update location
              <span className="text-lg leading-none">▾</span>
            </button>
          </div>
        </div>

        {/* Mobile slide-out menu */}
        <div
          className={`lg:hidden fixed inset-0 z-50 transition ${
            mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div
            className={`absolute right-0 top-0 h-full w-72 max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-semibold text-lg text-[#131921]">Hello, BBHC Member</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-gray-600"
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b">
                <p className="text-xs uppercase text-gray-500 mb-2">Quick links</p>
                <div className="grid grid-cols-2 gap-3">
                  {mobileQuickLinks.map((link) => (
                    <button
                      key={link.label}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-sm font-medium text-slate-800 hover:bg-amber-50 transition"
                    >
                      <span className="text-lg">{link.icon}</span>
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-b">
                <p className="text-xs uppercase text-gray-500 mb-2">Browse BBHC Bazaar</p>
                <div className="space-y-3">
                  {['Home', 'Deals', 'Fresh Finds', 'Mobiles', 'Electronics', 'Fashion', 'BBHC Pay'].map(
                    (item) => (
                      <button
                        key={item}
                        className="w-full text-left font-medium text-gray-800 hover:text-amber-600"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs uppercase text-gray-500 mb-2">Shop by category</p>
                <div className="grid grid-cols-2 gap-3">
                  {quickCategories.slice(0, 6).map((category) => (
                    <button
                      key={category.label}
                      className="flex flex-col items-start text-sm font-medium text-slate-800"
                    >
                      <span className="text-xl">•</span> {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button className="flex-1 py-2 rounded-full border border-[#131921] text-[#131921] font-semibold">
                Sign in
              </button>
              <button className="flex-1 py-2 rounded-full bg-[#131921] text-white font-semibold">
                Orders
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-0">
        {/* Hero Banner */}
        <section className="py-6">
          <div className="bg-white rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.12)] overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-8 space-y-5">
                <p className="text-sm uppercase tracking-widest text-amber-600 font-semibold">
                  {heroSlides[0].eyebrow}
                </p>
                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
                  {heroSlides[0].title}
                </h2>
                <p className="text-slate-600">{heroSlides[0].subtitle}</p>
                <button className="px-5 py-3 bg-[#131921] text-white rounded-full font-semibold shadow hover:bg-slate-900 transition">
                  {heroSlides[0].cta}
                </button>
                <p className="text-xs text-slate-400">Updated {today}</p>
              </div>
              <div className="relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${heroSlides[0].accent} blur-3xl opacity-80`}
                ></div>
                <img
                  src={heroSlides[0].image}
                  alt={heroSlides[0].title}
                  className="relative w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Circular quick links (mobile) */}
        <section className="lg:hidden py-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-lg font-semibold text-slate-900">Shop by category</h3>
            <button className="text-sm font-semibold text-amber-600">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty'].map((label, idx) => (
              <div key={label} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center text-lg font-bold text-[#131921]">
                  {label.slice(0, 1)}
                </div>
                <p className="text-xs text-slate-600 mt-2">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Spotlight slider */}
        <section className="py-4">
          <div className="space-y-4">
            {spotlightProducts.map((product, idx) => (
              <div
                key={product.title}
                className="bg-white rounded-[28px] shadow overflow-hidden relative"
              >
                <img src={product.image} alt={product.title} className="w-full h-60 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white">
                  <p className="uppercase text-sm tracking-[0.2em]">{product.title}</p>
                  <p className="text-3xl font-black">{product.subtitle}</p>
                  <p className="text-sm text-gray-200 mt-2">{product.cta}</p>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-1">
                  {spotlightProducts.map((_, dotIndex) => (
                    <span
                      key={dotIndex}
                      className={`w-2 h-2 rounded-full ${
                        dotIndex === idx ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick categories */}
        <section className="py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Shop by interest</h2>
            <button className="text-sm font-semibold text-amber-600">View all</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickCategories.map((category) => (
              <div
                key={category.label}
                className="relative rounded-2xl overflow-hidden group shadow hover:shadow-lg transition"
              >
                <img src={category.image} alt={category.label} className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <p className="absolute bottom-3 left-4 text-white font-semibold">{category.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Curated Collections */}
        <section className="py-8">
          <div className="grid md:grid-cols-3 gap-6">
            {curatedCollections.map((collection) => (
              <div
                key={collection.title}
                className="rounded-3xl overflow-hidden shadow group bg-gradient-to-br from-white to-slate-50"
              >
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="h-48 w-full object-cover"
                />
                <div className="p-6 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-amber-500 font-bold">
                    Curated edit
                  </p>
                  <h3 className="text-xl font-bold">{collection.title}</h3>
                  <p className="text-sm text-slate-600">{collection.tagline}</p>
                  <button className="text-sm font-semibold text-amber-600">
                    {collection.link} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommendation Rows */}
        {recommendationRows.map((row) => (
          <section key={row.title} className="py-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-900">{row.title}</h2>
              <button className="text-sm font-semibold text-amber-600">See more</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {row.products.map((product) => (
                <div
                  key={product.name}
                  className="min-w-[200px] bg-white rounded-2xl p-4 shadow hover:shadow-lg transition"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <p className="font-semibold text-sm">{product.name}</p>
                  <p className="text-amber-600 font-bold text-lg">{product.price}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between">
          {bottomNavItems.map((item) => (
            <button key={item.label} className="flex flex-col items-center text-xs text-slate-600">
              <span className="text-xl mb-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer className="mt-12 bg-[#131921] text-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-white mb-3">Get to know BBHC Bazaar</h4>
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
            <p className="text-sm text-gray-300 mb-3">
              Subscribe to receive curated collections and BBHC studio launches.
            </p>
            <div className="flex bg-white rounded-md overflow-hidden">
              <input className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Email address" />
              <button className="px-4 bg-amber-500 text-sm font-semibold text-slate-900">
                Join
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} BBHC Bazaar. Inspired by marketplace experiences loved by communities worldwide.
        </p>
      </footer>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between">
          {bottomNavItems.map((item) => (
            <button key={item.label} className="flex flex-col items-center text-xs text-slate-600">
              <span className="text-xl mb-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default Home
