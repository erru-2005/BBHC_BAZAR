import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  orders: [],
  loading: false,
  error: null,
  lastFetched: null
}

const outletSlice = createSlice({
  name: 'outlet',
  initialState,
  reducers: {
    setOutletOrders(state, action) {
      state.orders = action.payload
      state.lastFetched = Date.now()
      state.loading = false
    },
    setOutletLoading(state, action) {
      state.loading = action.payload
    },
    setOutletError(state, action) {
      state.error = action.payload
      state.loading = false
    },
    updateOutletOrder(state, action) {
      const updatedOrder = action.payload
      const index = state.orders.findIndex(o => o.id === updatedOrder.id)
      if (index !== -1) {
        state.orders[index] = updatedOrder
      }
    },
    removeOutletOrder(state, action) {
      // Remove a single order by id (e.g. on force-cancel by master)
      const orderId = action.payload
      state.orders = state.orders.filter(o => o.id !== orderId)
    },
    clearOutletData(state) {
      return initialState
    },
    invalidateOutletCache(state) {
      state.lastFetched = null
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', () => initialState)
  }
})

export const {
  setOutletOrders,
  setOutletLoading,
  setOutletError,
  updateOutletOrder,
  removeOutletOrder,
  clearOutletData,
  invalidateOutletCache
} = outletSlice.actions

export default outletSlice.reducer
