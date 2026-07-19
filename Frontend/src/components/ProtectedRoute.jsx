/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedRoute({ children, requiredUserType }) {
  const { isAuthenticated, userType, token } = useSelector((state) => state.auth)
  
  // Determine which token to look for based on required role
  const roleKey = requiredUserType === 'user' ? 'bbhc_user_token' : `bbhc_${requiredUserType}_token`
  const localToken = localStorage.getItem(roleKey) || localStorage.getItem('token')

  // If not authenticated in Redux but we have a local token, the session is likely being restored by App.jsx.
  // Wait instead of redirecting immediately.
  const isRestoring = (!isAuthenticated && localToken) || 
                      (isAuthenticated && userType !== requiredUserType && localStorage.getItem(roleKey));

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // If not authenticated and no token, OR if authenticated but wrong role
  if ((!isAuthenticated && !localToken) || (isAuthenticated && userType && userType !== requiredUserType)) {
    // Redirect to appropriate login page
    let loginPath = '/' 
    if (requiredUserType === 'master') {
      loginPath = '/master/login'
    } else if (requiredUserType === 'seller') {
      // If they have a user token, they are an internal seller, redirect to user login instead
      if (localStorage.getItem('bbhc_user_token')) {
        loginPath = '/user/login'
      } else {
        loginPath = '/seller/login'
      }
    } else if (requiredUserType === 'outlet_man') {
      loginPath = '/outlet/login'
    } else if (requiredUserType === 'user') {
      loginPath = '/user/login'
    }
    return <Navigate to={loginPath} replace />
  }

  return children
}

export default ProtectedRoute
