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


def emit_product_event(event_name, product_dict):
    """
    Broadcast product event to all listeners plus targeted masters/sellers.
    """
    if not product_dict:
        return

    # Broadcast to everyone (masters, sellers, public users)
    # Note: newer python-socketio versions don't support `broadcast` kw arg on Server.emit.
    # Emitting without a room/to argument sends to all connected clients.
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

