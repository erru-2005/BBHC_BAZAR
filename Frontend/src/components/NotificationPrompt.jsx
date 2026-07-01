import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateUserInfo } from '../store/authSlice'
import { enableNotifications } from '../services/api'

export default function NotificationPrompt() {
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Show prompt only if:
    // 1. User is authenticated
    // 2. User has NOT enabled notifications yet
    // 3. User has NOT dismissed the prompt in this session
    if (
      isAuthenticated &&
      user &&
      !user.notifications_enabled &&
      !sessionStorage.getItem('notification_prompt_dismissed')
    ) {
      // Small delay for natural appearance
      const timer = setTimeout(() => {
        setShow(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user])

  const handleEnable = async () => {
    setLoading(true)
    try {
      const fcmToken = window.flutterFCMToken || null
      await enableNotifications(fcmToken)
      
      // Update local Redux state
      dispatch(updateUserInfo({ notifications_enabled: true }))
      
      // If running inside Flutter Webview, notify the app shell
      if (window.AppNotifications) {
        window.AppNotifications.postMessage(
          JSON.stringify({ type: 'permission_granted' })
        )
      }
      
      setShow(false)
    } catch (error) {
      console.error('[NotificationPrompt] Failed to enable:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('notification_prompt_dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .prompt-card {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <div 
        className="prompt-card"
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1E2633',
          border: '1px solid #2B384E',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
          color: '#FFFFFF'
        }}
      >
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: 'rgba(255, 153, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#FF9900'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '30px', height: '30px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
        
        <h3 style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '10px',
          letterSpacing: '-0.3px',
          color: '#FFFFFF'
        }}>
          Enable Order Updates
        </h3>
        
        <p style={{
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#A0AEC0',
          marginBottom: '26px'
        }}>
          To get your order status updates, pickup alerts, and OTPs very quickly, please enable in-app notifications.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={handleEnable}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#FF9900',
              border: 'none',
              borderRadius: '10px',
              color: '#131921',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              outline: 'none'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E08800'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF9900'}
          >
            {loading ? 'Enabling...' : 'Enable Now'}
          </button>
          
          <button
            onClick={handleDismiss}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '10px',
              color: '#A0AEC0',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none'
            }}
            onMouseOver={(e) => e.target.style.color = '#FFFFFF'}
            onMouseOut={(e) => e.target.style.color = '#A0AEC0'}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
