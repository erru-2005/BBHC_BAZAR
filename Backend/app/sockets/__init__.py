"""
Socket.IO events registration
"""
from app.sockets.events import register_events


def register_socket_events(socketio):
    """Register all Socket.IO event handlers"""
    register_events(socketio)

