"""
Order service encapsulating MongoDB operations for customer orders.
"""
import random
from datetime import datetime
from bson import ObjectId

from app import mongo
from app.models.order import Order


class OrderService:
    """Business logic around order creation, retrieval, and status updates."""

    STATUS_CHOICES = {'pending', 'accepted', 'rejected', 'completed', 'cancelled'}

    @staticmethod
    def generate_order_number():
        """Generate a human-friendly order number."""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(100, 999)
        return f"BBHC-{timestamp}-{random_suffix}"

    @staticmethod
    def _ensure_object_id(value):
        if value is None:
            return None
        if isinstance(value, ObjectId):
            return value
        return ObjectId(str(value))

    @staticmethod
    def create_order(order_data):
        """Insert a new order document."""
        order_data = order_data.copy()
        order_data['order_number'] = order_data.get('order_number') or OrderService.generate_order_number()
        order_data['product_id'] = OrderService._ensure_object_id(order_data['product_id'])
        order_data['user_id'] = OrderService._ensure_object_id(order_data['user_id'])
        if order_data.get('seller_id'):
            order_data['seller_id'] = OrderService._ensure_object_id(order_data['seller_id'])
        order_data['created_at'] = datetime.utcnow()
        order_data['updated_at'] = datetime.utcnow()

        order = Order(**order_data)
        result = mongo.db.orders.insert_one(order.to_bson())
        order._id = result.inserted_id
        return order

    @staticmethod
    def get_orders(filter_query=None, limit=200):
        """Fetch orders that match a filter."""
        filter_query = filter_query or {}
        cursor = (
            mongo.db.orders
            .find(filter_query)
            .sort('created_at', -1)
            .limit(limit)
        )
        return [Order.from_bson(doc) for doc in cursor]

    @staticmethod
    def get_order_by_id(order_id):
        try:
            doc = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
            return Order.from_bson(doc)
        except Exception:
            return None

    @staticmethod
    def get_orders_by_user(user_id, limit=100):
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return []
        return OrderService.get_orders({'user_id': user_obj_id}, limit=limit)

    @staticmethod
    def update_order_status(order_id, status):
        """Update order status and return updated order."""
        if status not in OrderService.STATUS_CHOICES:
            raise ValueError("Invalid order status")
        try:
            order_obj_id = ObjectId(order_id)
        except Exception as exc:
            raise ValueError("Invalid order ID") from exc

        result = mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': status,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        if result.matched_count == 0:
            return None
        return OrderService.get_order_by_id(order_id)

    @staticmethod
    def cancel_order(order_id, user_id):
        """Allow a user to cancel their own pending order."""
        try:
            order_obj_id = ObjectId(order_id)
            user_obj_id = ObjectId(user_id)
        except Exception:
            return None, "Invalid order ID"

        order_doc = mongo.db.orders.find_one({'_id': order_obj_id, 'user_id': user_obj_id})
        if not order_doc:
            return None, "Order not found"

        status = order_doc.get('status', 'pending')
        if status not in ['pending']:
            return None, "Order cannot be cancelled at this stage"

        mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'cancelled',
                    'updated_at': datetime.utcnow()
                }
            }
        )
        return OrderService.get_order_by_id(order_id), None


