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

      // Notify the mobile app container to aggressively cache this session natively
      if (window.AppNotifications && userType === 'user') {
        try {
          window.AppNotifications.postMessage(JSON.stringify({
            type: 'session_sync',
            token: token,
            refresh_token: refresh_token,
            user: user
          }))
        } catch (e) {
          console.error("Failed to post session sync message to mobile container:", e)
        }
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
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.userType = null
      state.error = null
      
      // Clear all role-specific tokens
      const roles = ['user', 'seller', 'master', 'outlet_man']
      roles.forEach(role => {
        localStorage.removeItem(getRoleKey(role))
        localStorage.removeItem(getRefreshKey(role))
      })
      
      // Clear generic fallback tokens
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')

      // Notify the mobile app container if running in a WebView
      if (window.AppNotifications) {
        try {
          window.AppNotifications.postMessage(JSON.stringify({ type: 'logout' }))
        } catch (e) {
          console.error("Failed to post logout message to mobile container:", e)
        }
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

      // Notify mobile container of restored session
      if (window.AppNotifications && state.userType === 'user' && state.token) {
        try {
          const refreshToken = localStorage.getItem(getRefreshKey('user')) || localStorage.getItem('refresh_token')
          window.AppNotifications.postMessage(JSON.stringify({
            type: 'session_sync',
            token: state.token,
            refresh_token: refreshToken,
            user: state.user
          }))
        } catch (e) {
          console.error("Failed to post session sync message to mobile container:", e)
        }
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

