import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  userType: null, // 'seller' or 'master'
  loading: false,
  error: null
}

const getRoleKey = (role) => {
  if (!role) return 'bbhc_user_token'
  return `bbhc_${role}_token`
}

const getRefreshKey = (role) => {
  if (!role) return 'bbhc_user_refresh_token'
  return `bbhc_${role}_refresh_token`
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
      const { user, token, userType, refresh_token } = action.payload
      state.loading = false
      state.isAuthenticated = true
      state.user = user
      state.token = token
      state.userType = userType
      state.error = null
      
      // Role-specific storage to prevent session crossover
      const roleKey = getRoleKey(userType)
      localStorage.setItem(roleKey, token)
      
      // Also set the generic 'token' for legacy compatibility, 
      // but the role-specific one is now primary for isolation.
      localStorage.setItem('token', token)
      
      if (refresh_token) {
        localStorage.setItem(getRefreshKey(userType), refresh_token)
        localStorage.setItem('refresh_token', refresh_token)
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
    logout(state, action) {
      // action.payload can optionally specify WHICH role to logout
      // if not specified, we logout the CURRENT session role
      const targetRole = action.payload || state.userType
      
      if (targetRole === state.userType || !targetRole) {
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.userType = null
        state.error = null
      }
      
      // Clear role-specific storage
      localStorage.removeItem(getRoleKey(targetRole))
      localStorage.removeItem(getRefreshKey(targetRole))
      
      // If we just logged out the "main" token, clear it too
      if (localStorage.getItem('token') === localStorage.getItem(getRoleKey(targetRole))) {
         localStorage.removeItem('token')
         localStorage.removeItem('refresh_token')
      }
    },
    checkAuth(state) {
      // Logic moved to App.jsx for path-aware role detection
      const token = localStorage.getItem('token')
      if (token && !state.token) {
        state.token = token
      }
    },
    restoreUser(state, action) {
      if (!action.payload) return
      state.user = action.payload.user
      state.userType = action.payload.userType
      
      const roleToken = localStorage.getItem(getRoleKey(action.payload.userType))
      if (roleToken) {
        state.token = roleToken
        state.isAuthenticated = true
      } else if (localStorage.getItem('token')) {
        state.token = localStorage.getItem('token')
        state.isAuthenticated = true
      }
    },
    setUser(state, action) {
      state.user = action.payload
      if (state.token) {
        state.isAuthenticated = true
      }
    },
    setToken(state, action) {
      const token = action.payload
      state.token = token
      const roleKey = getRoleKey(state.userType)
      localStorage.setItem(roleKey, token)
      localStorage.setItem('token', token)
      if (state.user) {
        state.isAuthenticated = true
      }
    },
    updateUserInfo(state, action) {
      state.user = { ...state.user, ...action.payload }
    }
  }
})

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  checkAuth, 
  setUser, 
  restoreUser, 
  setToken,
  updateUserInfo
} = authSlice.actions
export default authSlice.reducer

