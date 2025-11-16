import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  userType: null, // 'seller' or 'master'
  loading: false,
  error: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true
      state.error = null
    },
    loginSuccess(state, action) {
      state.loading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.userType = action.payload.userType
      state.error = null
      // Only store token in localStorage (not user data - use Redux for that)
      localStorage.setItem('token', action.payload.token)
      if (action.payload.refresh_token) {
        localStorage.setItem('refresh_token', action.payload.refresh_token)
      }
    },
    loginFailure(state, action) {
      state.loading = false
      state.isAuthenticated = false
      state.error = action.payload
      state.user = null
      state.token = null
      state.userType = null
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.userType = null
      state.error = null
      // Clear localStorage (only token stored there)
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
    },
    checkAuth(state) {
      // Only check for token - user data will be fetched from backend if token exists
      const token = localStorage.getItem('token')
      
      if (token && !state.token) {
        state.token = token
        // User data will be fetched from backend on app load if token exists
        // Don't set isAuthenticated here - it will be set after user data is loaded
      }
    },
    restoreUser(state, action) {
      // Restore user data from backend (called when app loads with token)
      state.user = action.payload.user
      state.userType = action.payload.userType
      if (state.token) {
        state.isAuthenticated = true
      }
    },
    setUser(state, action) {
      state.user = action.payload
      if (state.token) {
        state.isAuthenticated = true
      }
    }
  }
})

export const { loginStart, loginSuccess, loginFailure, logout, checkAuth, setUser, restoreUser } = authSlice.actions
export default authSlice.reducer

