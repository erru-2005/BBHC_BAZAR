/**
 * Real-time Chat Component using Socket.IO
 */
import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { Button, Input, Card } from './index'

function Chat({ token = null, room = 'general' }) {
  const { socket, isConnected, connectionError } = useSocket(token, true)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    // Join room on mount
    socket.emit('join_room', { room })

    // Message handlers
    socket.on('new_message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: data.user_info?.username || 'Guest',
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      }])
    })

    socket.on('joined_room', (data) => {
      console.log('Joined room:', data)
    })

    socket.on('user_typing', (data) => {
      if (data.is_typing) {
        setTypingUsers(prev => [...new Set([...prev, data.user_id])])
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.user_id))
      }
    })

    // Cleanup
    return () => {
      socket.emit('leave_room', { room })
      socket.off('new_message')
      socket.off('joined_room')
      socket.off('user_typing')
    }
  }, [socket, room])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!message.trim() || !socket) return

    socket.emit('send_message', {
      room,
      message: message.trim(),
      timestamp: new Date().toISOString()
    })

    setMessage('')
    setIsTyping(false)
  }

  const handleTyping = (e) => {
    const value = e.target.value
    setMessage(value)

    if (!socket) return

    if (value && !isTyping) {
      setIsTyping(true)
      socket.emit('typing', { room, is_typing: true })
    } else if (!value && isTyping) {
      setIsTyping(false)
      socket.emit('typing', { room, is_typing: false })
    }
  }

  return (
    <Card title="Real-time Chat" className="max-w-2xl mx-auto">
      {/* Connection Status */}
      <div className="mb-4">
        {isConnected ? (
          <div className="flex items-center text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
            <span className="text-sm">Connected</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
            <span className="text-sm">
              {connectionError || 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Start chatting!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-semibold text-blue-600 mr-2">
                      {msg.user}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{msg.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 italic">
            {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          name="message"
          value={message}
          onChange={handleTyping}
          placeholder="Type your message..."
          className="flex-1"
          disabled={!isConnected}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!isConnected || !message.trim()}
        >
          Send
        </Button>
      </form>
    </Card>
  )
}

export default Chat

