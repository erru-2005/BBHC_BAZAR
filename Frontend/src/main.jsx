import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import { checkAuth, restoreUser } from './store/authSlice'
import { getCurrentUser } from './services/api'

// Component to initialize auth after rehydration
function AuthInitializer({ children }) {
  useEffect(() => {
    // Check auth and verify token after rehydration
    store.dispatch(checkAuth())
    
    // If token exists, fetch user data from backend to verify it's still valid
    const token = localStorage.getItem('token')
    const { isAuthenticated, user } = store.getState().auth
    
    // Only fetch if we have a token but no user (token might be invalid)
    if (token && (!isAuthenticated || !user)) {
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
