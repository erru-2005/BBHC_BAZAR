import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateUserInfo } from '../store/authSlice'
import { enableNotifications } from '../services/api'

export default function NotificationPrompt() {
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  useEffect(() => {
    const autoEnable = async () => {
      // If user is logged in but notifications aren't flagged as enabled,
      // silently enable them in the backend and local state.
      if (isAuthenticated && user && !user.notifications_enabled) {
        try {
          const fcmToken = window.flutterFCMToken || null
          console.log('[NotificationPrompt] Silently auto-enabling notifications...')
          await enableNotifications(fcmToken)
          
          // Update local Redux state
          dispatch(updateUserInfo({ notifications_enabled: true }))
          
          // If running inside Flutter Webview, notify the app shell
          if (window.AppNotifications) {
            window.AppNotifications.postMessage(
              JSON.stringify({ type: 'permission_granted' })
            )
          }
        } catch (error) {
          console.error('[NotificationPrompt] Failed to auto-enable notifications:', error)
        }
      }
    }
    
    autoEnable()
  }, [isAuthenticated, user, dispatch])

  // Do not render any UI elements to the user
  return null
}

