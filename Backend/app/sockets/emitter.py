"""
Utility helpers for emitting socket events to connected clients.
"""
from bson import ObjectId

from app import mongo, socketio


def _emit_to_collection(collection_name, filter_query, event_name, payload):
    """
    Emit an event to all active sockets stored on the given collection.
    """
    try:
        cursor = mongo.db[collection_name].find(filter_query, {'socket_id': 1})
        for doc in cursor:
            socket_id = doc.get('socket_id')
            if socket_id:
                socketio.emit(event_name, payload, room=socket_id)
    except Exception as exc:
        # We intentionally swallow errors here to avoid breaking the main request flow.
        print(f"[SocketEmitter] Failed to emit to {collection_name}: {exc}")


def _emit_to_user(user_id, event_name, payload):
    """Emit event to a specific user by their user_id."""
    try:
        user_doc = mongo.db.users.find_one({'_id': ObjectId(user_id)}, {'socket_id': 1})
        if user_doc and user_doc.get('socket_id'):
            socketio.emit(event_name, payload, room=user_doc['socket_id'])
    except Exception as exc:
        print(f"[SocketEmitter] Failed to emit to user {user_id}: {exc}")


def _emit_to_seller(seller_id, event_name, payload):
    """Emit event to a specific seller by their seller_id."""
    try:
        seller_doc = mongo.db.sellers.find_one({'_id': ObjectId(seller_id)}, {'socket_id': 1})
        if seller_doc and seller_doc.get('socket_id'):
            socketio.emit(event_name, payload, room=seller_doc['socket_id'])
    except Exception as exc:
        print(f"[SocketEmitter] Failed to emit to seller {seller_id}: {exc}")


def emit_product_event(event_name, product_dict):
    """
    Broadcast product event to all listeners plus targeted masters/sellers.
    """
    if not product_dict:
        return

    # Broadcast to everyone (masters, sellers, public users)
    socketio.emit(event_name, product_dict)

    seller_trade_id = product_dict.get('seller_trade_id')
    seller_id = product_dict.get('created_by_user_id')

    # Notify the owning seller explicitly if we have their trade ID or object id
    seller_filter = {}
    if seller_id:
        try:
            seller_filter['_id'] = ObjectId(seller_id)
        except Exception:
            seller_filter['_id'] = seller_id
    elif seller_trade_id:
        seller_filter['trade_id'] = seller_trade_id
    if seller_filter:
        _emit_to_collection('sellers', seller_filter, event_name, product_dict)

    # Notify all masters who are currently active
    _emit_to_collection('master', {'socket_id': {'$ne': None}}, event_name, product_dict)


def emit_order_event(event_name, order_dict, target_user_id=None, target_seller_id=None):
    """
    Broadcast order events (new, updated) to relevant parties.
    - Broadcasts to all masters
    - Targets specific user if target_user_id provided
    - Targets specific seller if target_seller_id provided
    """
    if not order_dict:
        return
    
    # Broadcast to all masters
    _emit_to_collection('master', {'socket_id': {'$ne': None}}, event_name, order_dict)
    
    # Broadcast to all outlet men
    _emit_to_collection('outlet_men', {'socket_id': {'$ne': None}}, event_name, order_dict)
    
    # Target specific user
    if target_user_id:
        _emit_to_user(target_user_id, event_name, order_dict)
    
    # Target specific seller
    if target_seller_id:
        _emit_to_seller(target_seller_id, event_name, order_dict)
    
    # Also broadcast generally (for any other listeners)
    socketio.emit(event_name, order_dict)
