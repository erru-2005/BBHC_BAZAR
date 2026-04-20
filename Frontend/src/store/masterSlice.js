import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sellers: [],
  users: [],
  outlets: [],
  products: [],
  orders: [],
  analytics: null,
  commissions: [],
  loading: {
    sellers: false,
    users: false,
    outlets: false,
    products: false,
    orders: false,
    analytics: false,
    commissions: false
  },
  error: null,
  lastFetched: {
    sellers: null,
    users: null,
    outlets: null,
    products: null,
    orders: null,
    analytics: null,
    commissions: null
  }
}

const masterSlice = createSlice({
  name: 'master',
  initialState,
  reducers: {
    setMastersData(state, action) {
      const { field, data } = action.payload
      state[field] = data
      state.lastFetched[field] = Date.now()
      state.loading[field] = false
    },
    setMastersLoading(state, action) {
      const { field, loading } = action.payload
      state.loading[field] = loading
    },
    setMastersError(state, action) {
      state.error = action.payload
      // Stop all loading on error
      Object.keys(state.loading).forEach(key => {
        state.loading[key] = false
      })
    },
    updateMasterSeller(state, action) {
      const updated = action.payload
      const index = state.sellers.findIndex(s => (s.id || s._id) === (updated.id || updated._id))
      if (index !== -1) {
        state.sellers[index] = { ...state.sellers[index], ...updated }
      }
    },
    updateMasterProduct(state, action) {
       const updated = action.payload
       const index = state.products.findIndex(p => (p.id || p._id) === (updated.id || updated._id))
       if (index !== -1) {
         state.products[index] = { ...state.products[index], ...updated }
       }
    },
    removeMasterItem(state, action) {
       const { field, id } = action.payload
       state[field] = state[field].filter(item => (item.id || item._id) !== id)
    },
    clearMasterData(state) {
      return initialState
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', () => initialState)
  }
})

export const {
  setMastersData,
  setMastersLoading,
  setMastersError,
  updateMasterSeller,
  updateMasterProduct,
  removeMasterItem,
  clearMasterData
} = masterSlice.actions

export default masterSlice.reducer
