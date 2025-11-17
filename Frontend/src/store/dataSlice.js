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
      { label: 'Men', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=60' },
      { label: 'Women', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=300&q=60' },
      { label: 'Kids', image: 'https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=300&q=60' },
      { label: 'Footwear', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=300&q=60' },
      { label: 'Accessories', image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=300&q=60' },
      { label: 'Beauty', image: 'https://images.unsplash.com/photo-1504595403659-9088ce801e29?auto=format&fit=crop&w=300&q=60' }
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
          {
            id: 'prod-1',
            name: 'Modular study nook',
            price: '₹7,499',
            mrp: '₹9,999',
            discount: '25% OFF',
            brand: 'Studio Nova',
            rating: 4.3,
            reviews: 142,
            image: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Onesize'],
            highlights: ['Solid mango-wood surface', 'Powder coated steel legs', 'Cable management slot'],
            description: 'Create a comfortable work corner with this modular table finished in matte oak veneer.'
          },
          {
            id: 'prod-2',
            name: 'Mindful diary set',
            price: '₹749',
            mrp: '₹1,099',
            discount: '32% OFF',
            brand: 'Paperloop',
            rating: 4.6,
            reviews: 88,
            image: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['A5'],
            highlights: ['Hardbound cover', '200 gsm premium paper', 'Includes pen + bookmark'],
            description: 'Guided prompts and blank pages to plan your day with calm clarity.'
          },
          {
            id: 'prod-3',
            name: 'Tabletop planter duo',
            price: '₹999',
            mrp: '₹1,499',
            discount: '33% OFF',
            brand: 'Leafy Loop',
            rating: 4.4,
            reviews: 64,
            image: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Small', 'Medium'],
            highlights: ['Ceramic build', 'Matte glaze', 'Includes drainage tray'],
            description: 'Set of two planters perfect for herbs and succulents on work desks.'
          },
          {
            id: 'prod-4',
            name: 'Heritage chai kit',
            price: '₹549',
            mrp: '₹749',
            discount: '26% OFF',
            brand: 'Kadak Club',
            rating: 4.7,
            reviews: 210,
            image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['4 blends'],
            highlights: ['Masala + Elaichi + Tulsi + Kadak blends', 'Comes with brass strainer'],
            description: 'Curated loose-leaf chai blends inspired by BBHC hometown vendors.'
          },
          {
            id: 'prod-5',
            name: 'Smart kettle',
            price: '₹2,799',
            mrp: '₹3,999',
            discount: '30% OFF',
            brand: 'BrewIQ',
            rating: 4.2,
            reviews: 119,
            image: 'https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1489336319193-86adfa4b85df?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['1.5 L'],
            highlights: ['4 temperature presets', 'Keeps warm for 2 hrs', 'Cool-touch body'],
            description: 'Wi-Fi enabled kettle that syncs with BBHC Brew app for one-touch recipes.'
          }
        ]
      },
      {
        id: 'row-2',
        title: 'Top picks near you',
        products: [
          {
            id: 'prod-6',
            name: 'Artisan lamp',
            price: '₹1,899',
            mrp: '₹2,499',
            discount: '24% OFF',
            brand: 'Clay&Co',
            rating: 4.5,
            reviews: 91,
            image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Onesize'],
            highlights: ['Hand-thrown ceramic base', 'Natural linen shade', 'BBHC artisan cluster'],
            description: 'Warm diffused lighting for cozy living rooms and bedside corners.'
          },
          {
            id: 'prod-7',
            name: 'Sustainable tote',
            price: '₹599',
            mrp: '₹899',
            discount: '33% OFF',
            brand: 'Loop & Loom',
            rating: 4.1,
            reviews: 76,
            image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Large'],
            highlights: ['Organic cotton', 'Reversible print', 'Concealed zipper pocket'],
            description: 'Carry markets, campus essentials and laptops with this BBHC tote.'
          },
          {
            id: 'prod-8',
            name: 'Fitness smart band',
            price: '₹3,299',
            mrp: '₹4,499',
            discount: '27% OFF',
            brand: 'PulseOne',
            rating: 4.0,
            reviews: 134,
            image: 'https://images.unsplash.com/photo-1421757350652-9f65a35effc7?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1421757350652-9f65a35effc7?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1491414418794-1d7d76b66f16?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Adjustable'],
            highlights: ['SpO2 + heart rate', '10-day battery', 'BBHC fitness app sync'],
            description: 'Stay on top of wellness goals with guided routines and alerts.'
          },
          {
            id: 'prod-9',
            name: 'BBHC shields',
            price: '₹299',
            mrp: '₹399',
            discount: '25% OFF',
            brand: 'ShieldUp',
            rating: 4.8,
            reviews: 58,
            image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['Pack of 3'],
            highlights: ['Triple layer melt-blown fabric', 'Adjustable ear loops', 'Washable'],
            description: 'Lightweight masks with BBHC artist prints for daily commutes.'
          },
          {
            id: 'prod-10',
            name: 'Gourmet spice rack',
            price: '₹1,249',
            mrp: '₹1,799',
            discount: '31% OFF',
            brand: 'Masala Story',
            rating: 4.6,
            reviews: 165,
            image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=500&q=60',
            images: [
              'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=900&q=80',
              'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
            ],
            sizes: ['12 jars'],
            highlights: ['Magnetic lids', 'Refill pouches included', 'Farm-to-table spices'],
            description: 'Organized seasoning rack with small batch spice blends from BBHC farms.'
          }
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
    wishlist: [],
    mobileQuickLinks: [
      { label: 'Profile', icon: '👤' },
      { label: 'Services', icon: '🛠️' },
      { label: 'Products', icon: '🛍️' },
      { label: 'Wishlist', icon: '❤️' },
      { label: 'Bag', icon: '👜' }
    ],
    bottomNavItems: [
      { label: 'Products', icon: 'products' },
      { label: 'Services', icon: 'services' },
      { label: 'Home', icon: 'home' },
      { label: 'Bag', icon: 'bag' },
      { label: 'Me', icon: 'account' }
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
    },
    toggleWishlist(state, action) {
      const id = action.payload
      if (!state.home.wishlist) {
        state.home.wishlist = []
      }
      const index = state.home.wishlist.indexOf(id)
      if (index === -1) {
        state.home.wishlist.push(id)
      } else {
        state.home.wishlist.splice(index, 1)
      }
    }
  }
})

export const { setData, setLoading, setError, toggleWishlist } = dataSlice.actions
export default dataSlice.reducer
