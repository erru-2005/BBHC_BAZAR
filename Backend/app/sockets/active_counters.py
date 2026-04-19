"""
Active Counter Socket Event Handlers
Defines specialized handlers for active counting. 
Registration/Connection logic is centralized in events.py to avoid handler conflicts.
"""
from flask_socketio import emit
from app.utils.active_counters import get_all_counts


def register_active_counter_events(socketio):
    """Register specialized active counter socket events"""
    
    @socketio.on('request_active_counts', namespace='/')
    def handle_request_active_counts():
        """Handle request for current active counts (for master dashboard)"""
        try:
            counts = get_all_counts()
            emit('active_counts', counts)
        except Exception as e:
            print(f"[Active Counter] Error getting active counts: {e}")
            emit('error', {'message': f'Error getting active counts: {str(e)}'})
