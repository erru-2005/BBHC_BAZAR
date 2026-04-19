"""
Socket.IO event handlers - minimal configuration
"""
from flask_socketio import emit, disconnect, ConnectionRefusedError
from flask import request
from flask_jwt_extended import decode_token
from bson import ObjectId
from app import mongo
from datetime import datetime, timezone
from app.utils.active_counters import (
    increment_counter,
    decrement_counter,
    register_socket,
    unregister_socket,
    get_role_for_socket,
    get_all_counts
)
from app.services.blacklist_service import BlacklistService


def register_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect', namespace='/')
    def handle_connect(auth=None):
        """Handle client connection (permissive - returns True immediately for stability)"""
        try:
            # We strictly return True immediately to allow the handshake/upgrade to finish
            # without triggering Werkzeug's 'write before start_response' error.
            # All role-specific logic is moved to the 'init_session' event.
            print(f"[Socket Events] Handshake started. SID: {request.sid}")
            
            if auth and 'token' in auth:
                try:
                    decode_token(auth['token'])
                except Exception as e:
                    print(f"[Socket Events] Token provided but invalid: {e}")
                    # We still return True to allow guest access
            
            return True
        except Exception as e:
            print(f"[Socket Events] Connection error: {str(e)}")
            return True # Always allow connection to avoid Invalid Frame Header in browser

    @socketio.on('init_session')
    def handle_init_session(data=None):
        """Client requests session initialization after connection is stable"""
        sid = request.sid
        auth = data or {}
        token = auth.get('token')
        role = auth.get('role', '').lower()
        
        print(f"[Socket Events] Initializing session for SID: {sid}, Role: {role}")
        
        authenticated = False
        user_id = None
        user_type = None
        
        # 1. Verify Token if provided
        if token:
            try:
                decoded = decode_token(token)
                user_id = decoded.get('sub') or decoded.get('user_id')
                user_type = decoded.get('user_type')
                
                if user_id and user_type:
                    authenticated = True
                    # Update Online Status in DB
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    
                    if user_type == 'master':
                        mongo.db.master.update_one({'_id': user_obj_id}, {'$set': {'status': 'active', 'socket_id': sid, 'last_connected_at': datetime.now(timezone.utc)}})
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one({'_id': user_obj_id}, {'$set': {'is_active': True, 'socket_id': sid, 'last_connected_at': datetime.now(timezone.utc)}})
                    elif user_type == 'user':
                        mongo.db.users.update_one({'_id': user_obj_id}, {'$set': {'socket_id': sid, 'last_connected_at': datetime.now(timezone.utc)}})
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one({'_id': user_obj_id}, {'$set': {'socket_id': sid, 'last_connected_at': datetime.now(timezone.utc)}})
                    
                    print(f"[Socket Events] Authenticated {user_type}: {user_id}")
            except Exception as e:
                print(f"[Socket Events] Session init auth failed: {e}")

        # 2. Register Role & Counters
        existing_role = get_role_for_socket(sid)
        if role and role != existing_role:
            valid_roles = ['user', 'seller', 'master', 'outlet']
            if role in valid_roles:
                # If they already had a role, unregister it first (unlikely but safe)
                if existing_role:
                    decrement_counter(existing_role)
                
                register_socket(sid, role)
                counts = increment_counter(role)
                emit('active_counts', counts, broadcast=True)
                emit('active_counter_status', {'message': f'Counting as {role}', 'role': role, 'counts': counts})
        
        # 3. Send final status
        emit('connected', {
            'message': 'Session initialized' if authenticated else 'Connected as guest',
            'authenticated': authenticated,
            'user_id': str(user_id) if user_id else None,
            'user_type': user_type
        })

    @socketio.on('disconnect', namespace='/')
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            socket_id = request.sid
            
            # First, handle active counter disconnection
            role = unregister_socket(socket_id)
            if role:
                # Decrement counter for active counter connections
                counts = decrement_counter(role)
                print(f"[Socket Events] {role.capitalize()} disconnected (active counter). Socket ID: {socket_id}. Counts: {counts}")
                # Broadcast updated counts - use room=None to broadcast to all
                socketio.emit('active_counts', counts, namespace='/', room=None)
            
            # Find user by socket_id and update status
            # Check masters collection
            master = mongo.db.master.find_one({'socket_id': socket_id})
            if master:
                mongo.db.master.update_one(
                    {'_id': master['_id']},
                    {'$set': {
                        'status': 'not_active',
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"[Socket Events] Master disconnected. ID: {master['_id']}")
                return

            # Check sellers collection
            seller = mongo.db.sellers.find_one({'socket_id': socket_id})
            if seller:
                mongo.db.sellers.update_one(
                    {'_id': seller['_id']},
                    {'$set': {
                        'is_active': False,
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"[Socket Events] Seller disconnected. ID: {seller['_id']}")
                return

            # Check users collection
            user = mongo.db.users.find_one({'socket_id': socket_id})
            if user:
                mongo.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"[Socket Events] User disconnected. ID: {user['_id']}")
                return
            
            # Check outlet_men collection
            outlet_man = mongo.db.outlet_men.find_one({'socket_id': socket_id})
            if outlet_man:
                mongo.db.outlet_men.update_one(
                    {'_id': outlet_man['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"[Socket Events] Outlet man disconnected. ID: {outlet_man['_id']}")
                return
                
        except Exception as e:
            print(f"[Socket Events] Error in handle_disconnect: {e}")
