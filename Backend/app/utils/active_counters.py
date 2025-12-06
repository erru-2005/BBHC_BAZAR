"""
In-Memory Active User/Seller/Master/Outlet Counter System
Counts are stored in server memory, not in database
"""
from threading import RLock

# In-memory counters (thread-safe)
_active_users = 0
_active_sellers = 0
_active_masters = 0
_active_outlets = 0

# Thread lock for safe concurrent access (RLock allows reentrant locking)
_counter_lock = RLock()

# Track socket IDs by role for proper cleanup
_socket_roles = {}  # {socket_id: role}


def increment_counter(role):
    """Increment the counter for a specific role"""
    global _active_users, _active_sellers, _active_masters, _active_outlets
    
    print(f"[Active Counter] increment_counter called with role: {role}")
    
    try:
        with _counter_lock:
            print(f"[Active Counter] Acquired lock, incrementing {role}")
            if role == 'user':
                _active_users += 1
                print(f"[Active Counter] Incremented users: {_active_users}")
            elif role == 'seller':
                _active_sellers += 1
                print(f"[Active Counter] Incremented sellers: {_active_sellers}")
            elif role == 'master':
                _active_masters += 1
                print(f"[Active Counter] Incremented masters: {_active_masters}")
            elif role == 'outlet':
                _active_outlets += 1
                print(f"[Active Counter] Incremented outlets: {_active_outlets}")
            
            print(f"[Active Counter] About to call get_all_counts()")
            counts = get_all_counts()
            print(f"[Active Counter] Current counts after increment: {counts}")
            print(f"[Active Counter] Returning counts: {counts}")
            return counts
    except Exception as e:
        print(f"[Active Counter] ERROR in increment_counter: {e}")
        import traceback
        traceback.print_exc()
        # Return current counts even on error
        return get_all_counts()


def decrement_counter(role):
    """Decrement the counter for a specific role"""
    global _active_users, _active_sellers, _active_masters, _active_outlets
    
    with _counter_lock:
        if role == 'user':
            _active_users = max(0, _active_users - 1)
            print(f"[Active Counter] Decremented users: {_active_users}")
        elif role == 'seller':
            _active_sellers = max(0, _active_sellers - 1)
            print(f"[Active Counter] Decremented sellers: {_active_sellers}")
        elif role == 'master':
            _active_masters = max(0, _active_masters - 1)
            print(f"[Active Counter] Decremented masters: {_active_masters}")
        elif role == 'outlet':
            _active_outlets = max(0, _active_outlets - 1)
            print(f"[Active Counter] Decremented outlets: {_active_outlets}")
        
        counts = get_all_counts()
        print(f"[Active Counter] Current counts: {counts}")
        return counts


def get_all_counts():
    """Get all active counts"""
    with _counter_lock:
        counts = {
            'users': _active_users,
            'sellers': _active_sellers,
            'masters': _active_masters,
            'outlets': _active_outlets
        }
        print(f"[Active Counter] get_all_counts() called. Returning: {counts}")
        print(f"[Active Counter] Registered sockets: {len(_socket_roles)} sockets")
        return counts


def register_socket(socket_id, role):
    """Register a socket with its role"""
    with _counter_lock:
        _socket_roles[socket_id] = role


def unregister_socket(socket_id):
    """Unregister a socket and return its role"""
    with _counter_lock:
        role = _socket_roles.pop(socket_id, None)
        return role


def get_role_for_socket(socket_id):
    """Get the role for a specific socket ID"""
    with _counter_lock:
        return _socket_roles.get(socket_id)


def reset_all_counters():
    """Reset all counters (useful for testing or server restart)"""
    global _active_users, _active_sellers, _active_masters, _active_outlets, _socket_roles
    
    with _counter_lock:
        _active_users = 0
        _active_sellers = 0
        _active_masters = 0
        _active_outlets = 0
        _socket_roles = {}

