import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  loading: false,
  error: null,
  home: {
    heroSlides: [
      {
        id: 'slide-1',
        eyebrow: 'Festival Specials',
        title: 'BBHCBazaar Mega Sale',
        subtitle: 'Exclusive collections across decor, food essentials, gadgets and more.',
        cta: 'Shop curated picks',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-rose-500/90 to-orange-400/80'
      },
      {
        id: 'slide-2',
        eyebrow: 'Work • Play • Repeat',
        title: 'Cozy corners & creator desks',
        subtitle: 'Ergonomic furniture, ambient lighting and desk essentials built for flow.',
        cta: 'Build your setup',
        image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-blue-600/80 to-sky-400/70'
      },
      {
        id: 'slide-3',
        eyebrow: 'Kitchen Lab',
        title: 'Smart cookware brings flavour & precision',
        subtitle: 'Top-rated appliances picked by chefs across BBHC community households.',
        cta: 'Cook with confidence',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1500&q=80',
        accent: 'from-emerald-500/80 to-lime-400/70'
      }
    ],
    quickCategories: [
      { label: 'Home & Decor', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=400&q=60' },
      { label: 'Gourmet & Grocery', image: 'https://images.unsplash.com/photo-1441123285228-1448e608f3d5?auto=format&fit=crop&w=400&q=60' },
      { label: 'Electronics', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=60' },
      { label: 'Kids & Baby', image: 'https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=400&q=60' },
      { label: 'Books & Stationery', image: 'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=400&q=60' },
      { label: 'Fashion & Essentials', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=60' }
    ],
    curatedCollections: [
      {
        title: 'Kid Studio',
        tagline: 'Play tables • learning corners • bedtime comfort',
        image: 'https://images.unsplash.com/photo-1504610926078-a1611febcad3?auto=format&fit=crop&w=900&q=80',
        link: 'Explore kid studio'
      },
      {
        title: 'Designer corners',
        tagline: 'Statement pieces from boutique creators on BBHCBazaar',
        image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=900&q=80',
        link: 'Meet the designers'
      },
      {
        title: 'Fresh & fit pantry',
        tagline: 'Cold-pressed oils, millet mixes and superfood jars',
        image: 'https://images.unsplash.com/photo-1457433575995-8407028a9970?auto=format&fit=crop&w=900&q=80',
        link: 'Stock your shelf'
      }
    ],
    recommendationRows: [
      {
        id: 'row-1',
        title: 'Inspired by your browsing',
        products: [
          { id: 'prod-1', name: 'Modular study nook', price: '₹7,499', image: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-2', name: 'Mindful diary set', price: '₹749', image: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-3', name: 'Tabletop planter duo', price: '₹999', image: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-4', name: 'Heritage chai kit', price: '₹549', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-5', name: 'Smart kettle', price: '₹2,799', image: 'https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?auto=format&fit=crop&w=500&q=60' }
        ]
      },
      {
        id: 'row-2',
        title: 'Top picks near you',
        products: [
          { id: 'prod-6', name: 'Artisan lamp', price: '₹1,899', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-7', name: 'Sustainable tote', price: '₹599', image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-8', name: 'Fitness smart band', price: '₹3,299', image: 'https://images.unsplash.com/photo-1421757350652-9f65a35effc7?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-9', name: 'BBHCBazaar shields', price: '₹299', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=60' },
          { id: 'prod-10', name: 'Gourmet spice rack', price: '₹1,249', image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=500&q=60' }
        ]
      }
    ],
    spotlightProducts: [
      {
        id: 'spot-1',
        title: "Women's clothing",
        subtitle: 'Under ₹499',
        cta: 'See Libas & Varanga picks',
        image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'spot-2',
        title: 'Sunglasses & frames',
        subtitle: 'Under ₹499',
        cta: 'Vincent Chase, Fastrack & more',
        image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'spot-3',
        title: 'Footwear essentials',
        subtitle: 'Starting ₹699',
        cta: 'Campus, Bata and more',
        image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80'
      }
    ],
    mobileQuickLinks: [
      { label: 'Profile', icon: '👤' },
      { label: 'Services', icon: '🛠️' },
      { label: 'Products', icon: '🛍️' },
      { label: 'Wishlist', icon: '❤️' },
      { label: 'Bag', icon: '🛒' }
    ],
    bottomNavItems: [
      { label: 'Home', icon: '🏠' },
      { label: 'Categories', icon: '🗂️' },
      { label: 'Deals', icon: '⚡' },
      { label: 'Cart', icon: '🛒' },
      { label: 'Account', icon: '👤' }
    ]
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
    }
  }
})

export const { setData, setLoading, setError } = dataSlice.actions
export default dataSlice.reducer
