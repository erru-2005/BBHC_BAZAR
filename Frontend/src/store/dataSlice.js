import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  loading: false,
  error: null,
  home: {
    // Layout content (static/sample data)
    heroSlides: [
      {
        id: 'slide-1',
        eyebrow: 'Festival Specials',
        title: 'BBHCBazaar Mega Sale',
        subtitle: 'Exclusive collections across decor, food essentials, gadgets and more.',
        cta: 'Shop curated picks',
        ctaLink: '/collections/festival',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-rose-500/90 to-orange-400/80'
      },
      {
        id: 'slide-2',
        eyebrow: 'Work • Play • Repeat',
        title: 'Cozy corners & creator desks',
        subtitle: 'Ergonomic furniture, ambient lighting and desk essentials built for flow.',
        cta: 'Build your setup',
        ctaLink: '/collections/studio',
        image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-blue-600/80 to-sky-400/70'
      },
      {
        id: 'slide-3',
        eyebrow: 'Kitchen Lab',
        title: 'Smart cookware brings flavour & precision',
        subtitle: 'Top-rated appliances picked by chefs across BBHC community households.',
        cta: 'Cook with confidence',
        ctaLink: '/collections/kitchen',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-emerald-500/80 to-lime-400/70'
      }
    ],
    quickCategories: [
      { label: 'Home & Decor', link: '/categories/home-decor', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=400&q=60' },
      { label: 'Gourmet & Grocery', link: '/categories/gourmet', image: 'https://images.unsplash.com/photo-1441123285228-1448e608f3d5?auto=format&fit=crop&w=400&q=60' },
      { label: 'Electronics', link: '/categories/electronics', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=60' },
      { label: 'Kids & Baby', link: '/categories/kids', image: 'https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=400&q=60' },
      { label: 'Books & Stationery', link: '/categories/books', image: 'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=400&q=60' },
      { label: 'Fashion & Essentials', link: '/categories/fashion', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=60' }
    ],
    curatedCollections: [
      {
        title: 'Kid Studio',
        tagline: 'Play tables • learning corners • bedtime comfort',
        link: '/collections/kids-studio',
        image: 'https://images.unsplash.com/photo-1504610926078-a1611febcad3?auto=format&fit=crop&w=900&q=80'
      },
      {
        title: 'Designer corners',
        tagline: 'Statement pieces from boutique creators on BBHCBazaar',
        link: '/collections/designer',
        image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=900&q=80'
      },
      {
        title: 'Fresh & fit pantry',
        tagline: 'Cold-pressed oils, millet mixes and superfood jars',
        link: '/collections/pantry',
        image: 'https://images.unsplash.com/photo-1457433575995-8407028a9970?auto=format&fit=crop&w=900&q=80'
      }
    ],
    recommendationRows: [
      {
        id: 'row-1',
        title: 'Inspired by your browsing',
        link: '/collections/trending'
      },
      {
        id: 'row-2',
        title: 'Top picks near you',
        link: '/collections/near-you'
      }
    ],
    spotlightProducts: [
      {
        id: 'spot-1',
        title: "Women's clothing",
        subtitle: 'Under ₹499',
        cta: 'See curated picks',
        link: '/collections/women-under-499',
        image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'spot-2',
        title: 'Sunglasses & frames',
        subtitle: 'Under ₹499',
        cta: 'Explore eyewear',
        link: '/collections/eyewear',
        image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'spot-3',
        title: 'Footwear essentials',
        subtitle: 'Starting ₹699',
        cta: 'Step in style',
        link: '/collections/footwear',
        image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80'
      }
    ],
    mobileQuickLinks: [
      { label: 'Profile', icon: 'profile' },
      { label: 'Services', icon: 'services' },
      { label: 'Products', icon: 'products' },
      { label: 'Wishlist', icon: 'wishlist' },
      { label: 'Bag', icon: 'bag' }
    ],
    bottomNavItems: [
      { label: 'Product', icon: 'product' },
      { label: 'Service', icon: 'service' },
      { label: 'Home', icon: 'home', isActive: true },
      { label: 'Bag', icon: 'bag' },
      { label: 'Me', icon: 'me' }
    ],
    // Products from backend and wishlist IDs
    products: [],
    wishlist: []
  }
}

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setData(state, action) {
      state.data = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    setError(state, action) {
      state.error = action.payload
    },
    setHomeProducts(state, action) {
      state.home.products = Array.isArray(action.payload) ? action.payload : []
    },
    toggleWishlist(state, action) {
      const productId = action.payload
      if (!productId) return
      if (!Array.isArray(state.home.wishlist)) {
        state.home.wishlist = []
      }
      const index = state.home.wishlist.indexOf(productId)
      if (index >= 0) {
        state.home.wishlist.splice(index, 1)
      } else {
        state.home.wishlist.push(productId)
      }
    }
  }
})

export const { setData, setLoading, setError, setHomeProducts, toggleWishlist } = dataSlice.actions
export default dataSlice.reducer
