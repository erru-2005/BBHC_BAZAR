/**
 * Chat Page with Socket.IO real-time communication
 */
import { useState } from 'react'
import Chat from '../components/Chat'

function ChatPage() {
  // In a real app, get token from auth context or localStorage
  const [token] = useState(localStorage.getItem('access_token'))

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Real-time Chat
        </h1>
        <Chat token={token} room="general" />
      </div>
    </div>
  )
}

export default ChatPage

