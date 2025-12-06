"""
Active Counter Socket Event Handlers
Handles real-time active user/seller/master/outlet counting
"""
from flask_socketio import emit
from flask import request
from app.utils.active_counters import (
    increment_counter,
    decrement_counter,
    get_all_counts,
    register_socket,
    unregister_socket,
    get_role_for_socket
)


def register_active_counter_events(socketio):
    """Register active counter socket events"""
    print("[Active Counter] Registering connect handler...")
    
    @socketio.on('connect', namespace='/')
    def handle_active_counter_connect(auth=None):
        """Handle client connection with role-based counting"""
        try:
            print(f"[Active Counter] ===== CONNECT EVENT TRIGGERED =====")
            print(f"[Active Counter] Request args: {dict(request.args)}")
            print(f"[Active Counter] Request environ QUERY_STRING: {request.environ.get('QUERY_STRING', 'N/A')}")
            
            # Get role from query parameters (frontend sends role in query)
            role = request.args.get('role', '').lower()
            
            # Also try to get from request.environ if not in args
            if not role:
                # Try to get from query string in environ
                query_string = request.environ.get('QUERY_STRING', '')
                print(f"[Active Counter] Query string from environ: {query_string}")
                if 'role=' in query_string:
                    role = query_string.split('role=')[1].split('&')[0].lower()
                    print(f"[Active Counter] Extracted role from query string: {role}")
            
            # Validate role
            valid_roles = ['user', 'seller', 'master', 'outlet']
            if role not in valid_roles:
                # Default to 'user' if no role specified
                role = 'user'
                print(f"[Active Counter] No role specified, defaulting to 'user'")
            
            socket_id = request.sid
            
            print(f"[Active Counter] Connection attempt - Socket ID: {socket_id}, Role: {role}")
            
            # Check if socket is already registered (prevent double counting)
            existing_role = get_role_for_socket(socket_id)
            if existing_role:
                print(f"[Active Counter] Socket {socket_id} already registered as {existing_role}, skipping")
                # Still send current counts
                counts = get_all_counts()
                emit('active_counts', counts)
                return
            
            # Register socket with role
            register_socket(socket_id, role)
            print(f"[Active Counter] Registered socket {socket_id} as {role}")
            
            # Increment counter for this role
            counts = increment_counter(role)
            
            print(f"[Active Counter] {role.capitalize()} connected. Socket ID: {socket_id}. Current counts: {counts}")
            
            # Broadcast updated counts to ALL clients (master dashboards will listen)
            # Use room=None to broadcast to all connected clients
            socketio.emit('active_counts', counts, namespace='/', room=None)
            print(f"[Active Counter] Broadcasted counts to all clients: {counts}")
            
            # Send confirmation to connecting client
            emit('connected', {
                'message': f'Connected as {role}',
                'role': role,
                'socket_id': socket_id,
                'counts': counts
            })
            
        except Exception as e:
            print(f"[Active Counter] Connection error: {e}")
            import traceback
            traceback.print_exc()
            emit('error', {'message': f'Connection error: {str(e)}'})
    
    @socketio.on('disconnect', namespace='/')
    def handle_active_counter_disconnect():
        """Handle client disconnection"""
        try:
            socket_id = request.sid
            print(f"[Active Counter] ===== DISCONNECT EVENT TRIGGERED =====")
            print(f"[Active Counter] Socket ID: {socket_id}")
            
            # Get role for this socket
            role = unregister_socket(socket_id)
            
            if role:
                # Decrement counter for this role
                counts = decrement_counter(role)
                
                # Broadcast updated counts to ALL clients (master dashboards will listen)
                # Use room=None to broadcast to all connected clients
                socketio.emit('active_counts', counts, namespace='/', room=None)
                
                print(f"[Active Counter] {role.capitalize()} disconnected. Socket ID: {socket_id}. Counts: {counts}")
            else:
                print(f"[Active Counter] Socket {socket_id} disconnected but had no registered role")
                
        except Exception as e:
            print(f"[Active Counter] Disconnection error: {e}")
            import traceback
            traceback.print_exc()
    
    @socketio.on('request_active_counts', namespace='/')
    def handle_request_active_counts():
        """Handle request for current active counts (for master dashboard)"""
        try:
            counts = get_all_counts()
            emit('active_counts', counts)
            print(f"[Active Counter] Active counts requested by {request.sid}. Counts: {counts}")
        except Exception as e:
            print(f"[Active Counter] Error getting active counts: {e}")
            import traceback
            traceback.print_exc()
            emit('error', {'message': f'Error getting active counts: {str(e)}'})

