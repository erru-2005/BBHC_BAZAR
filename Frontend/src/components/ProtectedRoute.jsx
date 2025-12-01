/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedRoute({ children, requiredUserType }) {
  const { isAuthenticated, userType, token } = useSelector((state) => state.auth)
  
  // Also check localStorage as fallback
  const localToken = localStorage.getItem('token')

  // If not authenticated in Redux and no token in localStorage, redirect to login
  if ((!isAuthenticated || !token) && !localToken) {
    // Redirect to appropriate login page
    let loginPath = '/seller/login'
    if (requiredUserType === 'master') {
      loginPath = '/master/login'
    } else if (requiredUserType === 'outlet_man') {
      loginPath = '/outlet/login'
    }
    return <Navigate to={loginPath} replace />
  }

  // Check if user type matches required type
  if (requiredUserType && userType && userType !== requiredUserType) {
    // Redirect to home if user type doesn't match
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute

