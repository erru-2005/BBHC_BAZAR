import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  products: [],
  orders: [],
  stats: null,
  productsLoading: false,
  ordersLoading: false,
  statsLoading: false,
  error: null,
  lastFetched: {
    products: null,
    orders: null,
    stats: null
  }
}

const sellerSlice = createSlice({
  name: 'seller',
  initialState,
  reducers: {
    setSellerProducts(state, action) {
      state.products = action.payload
      state.lastFetched.products = Date.now()
      state.productsLoading = false
    },
    setSellerOrders(state, action) {
      state.orders = action.payload
      state.lastFetched.orders = Date.now()
      state.ordersLoading = false
    },
    setSellerStats(state, action) {
      state.stats = action.payload
      state.lastFetched.stats = Date.now()
      state.statsLoading = false
    },
    setSellerLoading(state, action) {
      const { field, loading } = action.payload
      if (field === 'products') state.productsLoading = loading
      else if (field === 'orders') state.ordersLoading = loading
      else if (field === 'stats') state.statsLoading = loading
    },
    setSellerError(state, action) {
      state.error = action.payload
      state.productsLoading = false
      state.ordersLoading = false
      state.statsLoading = false
    },
    updateSellerOrder(state, action) {
      const updatedOrder = action.payload
      const index = state.orders.findIndex(o => o.id === updatedOrder.id)
      if (index !== -1) {
        state.orders[index] = updatedOrder
      } else {
        state.orders.unshift(updatedOrder)
      }
    },
    removeSellerProduct(state, action) {
      state.products = state.products.filter(p => (p.id || p._id) !== action.payload)
    },
    clearSellerData(state) {
      return initialState
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', () => initialState)
  }
})

export const {
  setSellerProducts,
  setSellerOrders,
  setSellerStats,
  setSellerLoading,
  setSellerError,
  updateSellerOrder,
  removeSellerProduct,
  clearSellerData
} = sellerSlice.actions

export default sellerSlice.reducer
