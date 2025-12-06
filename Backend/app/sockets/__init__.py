"""
Socket.IO events registration
"""
from app.sockets.active_counters import register_active_counter_events
from app.sockets.events import register_events


def register_socket_events(socketio):
    """Register all Socket.IO event handlers"""
    print("[Socket Registration] Registering active counter events FIRST...")
    # Register active counter events FIRST (role-based counting from query params)
    # This MUST be registered first so it handles role-based connections
    register_active_counter_events(socketio)
    print("[Socket Registration] Active counter events registered")
    
    print("[Socket Registration] Registering other socket events...")
    # Register other socket events (analytics, etc.) - these may have their own connect handlers
    # Note: If there are multiple connect handlers, they will all be called
    register_events(socketio)
    print("[Socket Registration] All socket events registered")

