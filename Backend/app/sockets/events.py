"""
Socket.IO event handlers for real-time communication
"""
from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import emit, join_room, leave_room, disconnect
from app import mongo
from app.services.user_service import UserService


def register_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        try:
            # Get token from auth data
            token = auth.get('token') if auth else None
            
            if token:
                try:
                    # Decode and verify JWT token
                    decoded = decode_token(token)
                    user_id = decoded.get('sub')
                    
                    # Verify user exists and is active
                    user = UserService.get_user_by_id(user_id)
                    if user and user.is_active:
                        # Store user_id in session
                        request.sid_user_id = user_id
                        emit('connected', {
                            'message': 'Connected successfully',
                            'user_id': user_id
                        })
                        return True
                    else:
                        emit('error', {'message': 'User not found or inactive'})
                        disconnect()
                        return False
                except Exception as e:
                    emit('error', {'message': 'Invalid token'})
                    disconnect()
                    return False
            else:
                # Allow connection without auth for public events
                emit('connected', {'message': 'Connected (guest)'})
                return True
        except Exception as e:
            emit('error', {'message': 'Connection failed'})
            disconnect()
            return False
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        user_id = getattr(request, 'sid_user_id', None)
        if user_id:
            print(f'User {user_id} disconnected')
        else:
            print('Guest user disconnected')
    
    @socketio.on('join_room')
    def handle_join_room(data):
        """Handle joining a room"""
        room = data.get('room')
        if room:
            join_room(room)
            emit('joined_room', {'room': room, 'message': f'Joined room: {room}'})
            # Notify others in the room
            socketio.emit('user_joined', {
                'room': room,
                'user_id': getattr(request, 'sid_user_id', 'guest')
            }, room=room)
    
    @socketio.on('leave_room')
    def handle_leave_room(data):
        """Handle leaving a room"""
        room = data.get('room')
        if room:
            leave_room(room)
            emit('left_room', {'room': room, 'message': f'Left room: {room}'})
            # Notify others in the room
            socketio.emit('user_left', {
                'room': room,
                'user_id': getattr(request, 'sid_user_id', 'guest')
            }, room=room)
    
    @socketio.on('send_message')
    def handle_message(data):
        """Handle sending messages"""
        try:
            room = data.get('room')
            message = data.get('message')
            user_id = getattr(request, 'sid_user_id', 'guest')
            
            if not message:
                emit('error', {'message': 'Message is required'})
                return
            
            # Get user info if authenticated
            user_info = {}
            if user_id != 'guest':
                user = UserService.get_user_by_id(user_id)
                if user:
                    user_info = {
                        'id': str(user._id),
                        'username': user.username,
                        'email': user.email
                    }
            
            message_data = {
                'user_id': user_id,
                'user_info': user_info,
                'message': message,
                'room': room,
                'timestamp': data.get('timestamp')
            }
            
            if room:
                # Send to specific room
                socketio.emit('new_message', message_data, room=room)
            else:
                # Broadcast to all connected clients
                socketio.emit('new_message', message_data)
            
            emit('message_sent', {'status': 'success'})
        except Exception as e:
            emit('error', {'message': str(e)})
    
    @socketio.on('typing')
    def handle_typing(data):
        """Handle typing indicator"""
        room = data.get('room')
        user_id = getattr(request, 'sid_user_id', 'guest')
        is_typing = data.get('is_typing', True)
        
        if room:
            socketio.emit('user_typing', {
                'user_id': user_id,
                'is_typing': is_typing,
                'room': room
            }, room=room, include_self=False)
    
    @socketio.on('get_online_users')
    def handle_get_online_users(data):
        """Get list of online users in a room"""
        room = data.get('room')
        if room:
            # Get all clients in the room
            room_clients = socketio.server.manager.get_rooms('/')[room] if room in socketio.server.manager.get_rooms('/') else []
            emit('online_users', {'room': room, 'count': len(room_clients)})
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping for connection testing"""
        emit('pong', {'message': 'pong'})

