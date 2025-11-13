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
      // Store in localStorage
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
      localStorage.setItem('userType', action.payload.userType)
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
      // Clear localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userType')
    },
    checkAuth(state) {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      const userType = localStorage.getItem('userType')
      
      if (token && user && userType) {
        state.isAuthenticated = true
        state.token = token
        state.user = JSON.parse(user)
        state.userType = userType
      }
    }
  }
})

export const { loginStart, loginSuccess, loginFailure, logout, checkAuth } = authSlice.actions
export default authSlice.reducer

