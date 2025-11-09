# WebSocket (Socket.IO) Configuration Guide

## ✅ Configuration Complete!

WebSocket (Socket.IO) is now configured for real-time communication on both backend and frontend.

---

## 🔧 Backend Configuration

### Packages Added:
- `python-socketio==5.11.0` - Socket.IO server library
- `flask-socketio==5.3.6` - Flask integration for Socket.IO
- `eventlet==0.36.1` - Async server for Socket.IO

### Files Created/Modified:

1. **`app/__init__.py`**
   - Initialized SocketIO
   - Registered socket event handlers

2. **`app.py`**
   - Changed to use `socketio.run()` instead of `app.run()`

3. **`app/sockets/events.py`** (NEW)
   - All Socket.IO event handlers:
     - `connect` - Handle client connections
     - `disconnect` - Handle disconnections
     - `join_room` - Join a room/channel
     - `leave_room` - Leave a room
     - `send_message` - Send real-time messages
     - `typing` - Typing indicators
     - `get_online_users` - Get online users count
     - `ping` - Connection testing

4. **`config.py`**
   - Added Socket.IO CORS configuration

---

## 🎨 Frontend Configuration

### Packages Added:
- `socket.io-client==4.7.5` - Socket.IO client for React

### Files Created:

1. **`src/utils/socket.js`**
   - Socket.IO connection utility
   - Functions: `initSocket()`, `getSocket()`, `disconnectSocket()`

2. **`src/hooks/useSocket.js`**
   - React hook for Socket.IO
   - Returns: `socket`, `isConnected`, `connectionError`

3. **`src/components/Chat.jsx`**
   - Complete real-time chat component
   - Features: messages, typing indicators, room support

4. **`src/pages/ChatPage.jsx`**
   - Chat page component

---

## 🚀 How to Use

### Backend:

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the server:**
```bash
python app.py
```

The server will run on `http://localhost:5000` with Socket.IO support.

### Frontend:

1. **Install dependencies:**
```bash
npm install
```

2. **Run the frontend:**
```bash
npm run dev
```

3. **Access chat page:**
Navigate to `http://localhost:5173/chat`

---

## 📡 Socket.IO Events

### Client → Server Events:

| Event | Description | Data |
|-------|-------------|------|
| `connect` | Connect to server | `{ token: 'jwt_token' }` |
| `join_room` | Join a room | `{ room: 'room_name' }` |
| `leave_room` | Leave a room | `{ room: 'room_name' }` |
| `send_message` | Send a message | `{ room: 'room_name', message: 'text' }` |
| `typing` | Typing indicator | `{ room: 'room_name', is_typing: true/false }` |
| `get_online_users` | Get online users | `{ room: 'room_name' }` |
| `ping` | Test connection | - |

### Server → Client Events:

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Connection successful | `{ message: '...', user_id: '...' }` |
| `error` | Error occurred | `{ message: 'error message' }` |
| `joined_room` | Joined room confirmation | `{ room: 'room_name' }` |
| `new_message` | New message received | `{ user_id, user_info, message, room, timestamp }` |
| `user_typing` | User typing indicator | `{ user_id, is_typing, room }` |
| `online_users` | Online users count | `{ room, count }` |
| `pong` | Ping response | `{ message: 'pong' }` |

---

## 💻 Usage Examples

### Frontend - Basic Connection:

```javascript
import { useSocket } from './hooks/useSocket'

function MyComponent() {
  const token = localStorage.getItem('access_token')
  const { socket, isConnected } = useSocket(token)

  useEffect(() => {
    if (!socket) return

    // Listen for messages
    socket.on('new_message', (data) => {
      console.log('New message:', data)
    })

    // Send a message
    socket.emit('send_message', {
      room: 'general',
      message: 'Hello!'
    })
  }, [socket])

  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
}
```

### Frontend - Join Room:

```javascript
socket.emit('join_room', { room: 'general' })

socket.on('joined_room', (data) => {
  console.log('Joined:', data.room)
})
```

### Backend - Emit to Room:

```python
# In your route or service
from app import socketio

socketio.emit('new_message', {
    'message': 'Hello from server',
    'room': 'general'
}, room='general')
```

---

## 🔐 Authentication

Socket.IO supports JWT authentication:

1. **Frontend:** Pass token when connecting:
```javascript
const socket = initSocket('your_jwt_token')
```

2. **Backend:** Token is verified on connection
3. **User ID** is stored in session for authenticated users

---

## 🎯 Features Implemented

✅ Real-time messaging
✅ Room/channel support
✅ Typing indicators
✅ Online users tracking
✅ JWT authentication
✅ Connection status
✅ Error handling
✅ Auto-reconnection
✅ Guest support (no auth required)

---

## 🧪 Testing

### Test Connection:

```javascript
// Frontend
socket.emit('ping')
socket.on('pong', () => console.log('Connection OK'))
```

### Test Message:

1. Open two browser tabs
2. Navigate to `/chat` in both
3. Send a message in one tab
4. See it appear in the other tab instantly!

---

## 📝 Environment Variables

### Frontend (`.env`):
```env
VITE_SOCKET_URL=http://localhost:5000
```

### Backend (`.env`):
```env
SOCKETIO_CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## 🚨 Troubleshooting

### Connection Issues:
- Check CORS settings in `config.py`
- Verify Socket.IO URL in frontend
- Check if server is running with `socketio.run()`

### Authentication Issues:
- Ensure JWT token is valid
- Check token format in auth object

### Messages Not Appearing:
- Verify room names match
- Check if both clients are in the same room
- Check browser console for errors

---

## ✅ Summary

**WebSocket (Socket.IO) is fully configured!**

- ✅ Backend: Flask-SocketIO configured
- ✅ Frontend: Socket.IO client configured
- ✅ Real-time chat component ready
- ✅ Authentication support
- ✅ Room/channel support
- ✅ Typing indicators
- ✅ Ready to use!

Open `/chat` page to test real-time communication!

