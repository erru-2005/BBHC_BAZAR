import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import { checkAuth, restoreUser } from './store/authSlice'
import { getCurrentUser } from './services/api'

// Helper function to decode JWT token and get user type
function getUserTypeFromToken(token) {
  try {
    if (!token) return null
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    return decoded.user_type || null
  } catch (error) {
    return null
  }
}

// Component to initialize auth after rehydration
function AuthInitializer({ children }) {
  useEffect(() => {
    // Check auth and verify token after rehydration
    store.dispatch(checkAuth())
    
    // If token exists, fetch user data from backend to verify it's still valid
    // BUT only if it's not a seller or master token (don't fetch seller/master data in user section)
    const token = localStorage.getItem('token')
    const { isAuthenticated, user } = store.getState().auth
    
    // Check token user type - don't fetch if it's seller or master
    const tokenUserType = getUserTypeFromToken(token)
    
    // Only fetch if we have a token but no user, AND it's not a seller or master token
    if (token && (!isAuthenticated || !user) && tokenUserType !== 'seller' && tokenUserType !== 'master') {
      getCurrentUser()
        .then((userData) => {
          store.dispatch(restoreUser(userData))
        })
        .catch((error) => {
          // If fetching user fails, token might be invalid - clear it
          console.error('Failed to restore user:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
        })
    }
  }, [])
  
  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthInitializer>
          <App />
        </AuthInitializer>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
