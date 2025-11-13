/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedRoute({ children, requiredUserType }) {
  const { isAuthenticated, userType } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    const loginPath = requiredUserType === 'master' ? '/master/login' : '/seller/login'
    return <Navigate to={loginPath} replace />
  }

  // Check if user type matches required type
  if (requiredUserType && userType !== requiredUserType) {
    // Redirect to home if user type doesn't match
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute

