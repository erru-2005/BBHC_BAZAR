import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sellers: [],
  users: [],
  outlets: [],
  products: [],
  orders: [],
  blacklistedSellers: [],
  blacklistedOutlets: [],
  analytics: null,
  commissions: [],
  loading: {
    sellers: false,
    users: false,
    outlets: false,
    products: false,
    orders: false,
    blacklistedSellers: false,
    blacklistedOutlets: false,
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
    blacklistedSellers: null,
    blacklistedOutlets: null,
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
       const targetId = String(id)
       state[field] = state[field].filter(item => String(item.id || item._id) !== targetId)
    },
    invalidateMasterCache(state, action) {
      const fields = action.payload
      if (!fields || fields.length === 0) {
        Object.keys(state.lastFetched).forEach((key) => {
          state.lastFetched[key] = null
        })
        return
      }
      fields.forEach((field) => {
        if (state.lastFetched[field] !== undefined) {
          state.lastFetched[field] = null
        }
      })
    },
    addMasterBlacklistedItem(state, action) {
      const { field, item } = action.payload
      const id = String(item?.id || item?._id || '')
      if (!id || !Array.isArray(state[field])) return
      const exists = state[field].some((x) => String(x.id || x._id) === id)
      if (!exists) {
        state[field].unshift(item)
      }
      state.lastFetched[field] = Date.now()
    },
    removeMasterBlacklistedItem(state, action) {
      const { field, id } = action.payload
      const targetId = String(id)
      state[field] = state[field].filter((item) => String(item.id || item._id) !== targetId)
      state.lastFetched[field] = Date.now()
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
  invalidateMasterCache,
  addMasterBlacklistedItem,
  removeMasterBlacklistedItem,
  clearMasterData
} = masterSlice.actions

export default masterSlice.reducer
