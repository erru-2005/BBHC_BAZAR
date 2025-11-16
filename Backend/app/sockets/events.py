"""
Socket.IO event handlers - minimal configuration
"""
from flask_socketio import emit, disconnect
from flask import request
from flask_jwt_extended import decode_token
from bson import ObjectId
from app import mongo
from datetime import datetime


def register_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        try:
            # Get user info from auth token
            user_id = None
            user_type = None
            username = None
            
            if auth and 'token' in auth:
                try:
                    decoded = decode_token(auth['token'])
                    user_id = decoded.get('sub') or decoded.get('user_id')
                    user_type = decoded.get('user_type')  # 'master' or 'seller'
                    username = decoded.get('username')
                except Exception:
                    pass
            
            # Update user status to 'active' and save socket ID if user_id is provided
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    socket_id = request.sid  # Get socket session ID
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'active',
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': True,
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                except Exception as e:
                    print(f"Error updating user status on connect: {e}")
                    pass
            
            emit('connected', {
                'message': 'Connected successfully',
                'user_id': user_id,
                'user_type': user_type
            })
        except Exception as e:
            emit('error', {'message': f'Connection error: {str(e)}'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            socket_id = request.sid
            
            # Find user by socket_id and update status to not_active
            # Check masters collection
            master = mongo.db.master.find_one({'socket_id': socket_id})
            if master:
                mongo.db.master.update_one(
                    {'_id': master['_id']},
                    {'$set': {
                        'status': 'not_active',
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
            
            # Check sellers collection
            seller = mongo.db.sellers.find_one({'socket_id': socket_id})
            if seller:
                mongo.db.sellers.update_one(
                    {'_id': seller['_id']},
                    {'$set': {
                        'is_active': False,
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
        except Exception as e:
            print(f"Error updating user status on disconnect: {e}")
            pass
    
    @socketio.on('user_authenticated')
    def handle_user_authenticated(data):
        """Handle user authentication via socket"""
        try:
            user_id = data.get('user_id')
            user_type = data.get('user_type')  # 'master' or 'seller'
            
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    socket_id = request.sid  # Get socket session ID
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'active',
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': True,
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    
                    emit('status_updated', {'status': 'active', 'socket_id': socket_id})
                except Exception as e:
                    print(f"Error updating user status on authentication: {e}")
                    pass
        except Exception as e:
            emit('error', {'message': f'Status update error: {str(e)}'})
    
    @socketio.on('user_logout')
    def handle_user_logout(data):
        """Handle user logout via socket"""
        try:
            user_id = data.get('user_id')
            user_type = data.get('user_type')  # 'master' or 'seller'
            
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'not_active',
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': False,
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    
                    emit('status_updated', {'status': 'not_active'})
                except Exception as e:
                    print(f"Error updating user status on logout: {e}")
                    pass
        except Exception as e:
            emit('error', {'message': f'Status update error: {str(e)}'})
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping for connection testing"""
        emit('pong', {'message': 'pong'})
