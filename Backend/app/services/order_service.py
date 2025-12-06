"""
Order service encapsulating MongoDB operations for customer orders.
"""
import random
import secrets
import hashlib
from datetime import datetime
from bson import ObjectId

from app import mongo
from app.models.order import Order
from app.services.product_service import ProductService
from app.services.statistics_service import StatisticsService
from app.sockets.emitter import emit_product_event


class OrderService:
    """Business logic around order creation, retrieval, and status updates."""

    STATUS_CHOICES = {
        'pending_seller',
        'seller_accepted',
        'seller_rejected',
        'ready_for_pickup',
        'handed_over',
        'completed',
        'cancelled',
        'cancelled_master'
    }

    @staticmethod
    def generate_order_number():
        """Generate a human-friendly order number."""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(100, 999)
        return f"BBHC-{timestamp}-{random_suffix}"

    @staticmethod
    def generate_secure_token(order_id, seller_id, user_id, role='user'):
        """Generate a secure token for QR code scanning."""
        # Create a unique token based on order, seller, user, and role
        token_data = f"{order_id}|{seller_id}|{user_id}|{role}|{secrets.token_urlsafe(16)}"
        token_hash = hashlib.sha256(token_data.encode()).hexdigest()[:32]
        return f"BBHC-{token_hash.upper()}"

    @staticmethod
    def _ensure_object_id(value):
        if value is None:
            return None
        if isinstance(value, ObjectId):
            return value
        return ObjectId(str(value))

    @staticmethod
    def reduce_product_quantity(product_id, quantity):
        """Atomically reduce product quantity. Returns True if successful, False if insufficient stock."""
        try:
            product_obj_id = ObjectId(product_id)
            result = mongo.db.products.update_one(
                {
                    '_id': product_obj_id,
                    'quantity': {'$gte': quantity}
                },
                {
                    '$inc': {'quantity': -quantity},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            if result.matched_count > 0:
                # Emit real-time product update so quantity changes are reflected everywhere
                try:
                    product = ProductService.get_product_by_id(str(product_obj_id))
                    if product:
                        emit_product_event('product_updated', product.to_dict())
                except Exception as exc:
                    # Log but don't break order flow
                    print(f"[OrderService] Failed to emit product update after reduce: {exc}")
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def restore_product_quantity(product_id, quantity):
        """Restore product quantity (e.g., on order cancellation)."""
        try:
            product_obj_id = ObjectId(product_id)
            result = mongo.db.products.update_one(
                {'_id': product_obj_id},
                {
                    '$inc': {'quantity': quantity},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            if result.matched_count > 0:
                try:
                    product = ProductService.get_product_by_id(str(product_obj_id))
                    if product:
                        emit_product_event('product_updated', product.to_dict())
                except Exception as exc:
                    print(f"[OrderService] Failed to emit product update after restore: {exc}")
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def create_order(order_data):
        """Insert a new order document."""
        order_data = order_data.copy()
        order_data['order_number'] = order_data.get('order_number') or OrderService.generate_order_number()
        order_data['product_id'] = OrderService._ensure_object_id(order_data['product_id'])
        order_data['user_id'] = OrderService._ensure_object_id(order_data['user_id'])
        if order_data.get('seller_id'):
            order_data['seller_id'] = OrderService._ensure_object_id(order_data['seller_id'])
        if order_data.get('outlet_id'):
            order_data['outlet_id'] = OrderService._ensure_object_id(order_data['outlet_id'])
        order_data['created_at'] = datetime.utcnow()
        order_data['updated_at'] = datetime.utcnow()
        order_data['status'] = order_data.get('status', 'pending_seller')
        
        # Initialize status history
        if 'status_history' not in order_data:
            order_data['status_history'] = [{
                'status': order_data['status'],
                'timestamp': datetime.utcnow(),
                'note': 'Order created'
            }]

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
    def get_order_by_token(token):
        """Find order by secure token (user or seller)."""
        try:
            doc = mongo.db.orders.find_one({
                '$or': [
                    {'secure_token_user': token},
                    {'secure_token_seller': token}
                ]
            })
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
    def get_orders_by_seller(seller_id, limit=100):
        try:
            seller_obj_id = ObjectId(seller_id)
        except Exception:
            return []
        return OrderService.get_orders({'seller_id': seller_obj_id}, limit=limit)

    @staticmethod
    def update_order_status(order_id, status, note=None, updated_by=None):
        """Update order status and add to history. Returns updated order."""
        if status not in OrderService.STATUS_CHOICES:
            raise ValueError(f"Invalid order status: {status}")
        try:
            order_obj_id = ObjectId(order_id)
        except Exception as exc:
            raise ValueError("Invalid order ID") from exc

        # Get current order to append to history
        current_order = OrderService.get_order_by_id(order_id)
        if not current_order:
            return None

        status_history = current_order.status_history or []
        status_history.append({
            'status': status,
            'timestamp': datetime.utcnow(),
            'note': note or f'Status changed to {status}',
            'updated_by': updated_by
        })

        result = mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': status,
                    'updated_at': datetime.utcnow(),
                    'status_history': status_history
                }
            }
        )
        if result.matched_count == 0:
            return None
        
        updated_order = OrderService.get_order_by_id(order_id)
        
        # If order is completed, add to statistics
        if status == 'completed' and updated_order:
            try:
                order_total = float(updated_order.total_amount or 0)
                seller_id = str(updated_order.seller_id) if updated_order.seller_id else None
                # Get commission rate from product snapshot or default to 10%
                product_snapshot = updated_order.product_snapshot or {}
                commission_rate = product_snapshot.get('commission_rate', 0.10)
                if commission_rate > 1:
                    commission_rate = commission_rate / 100  # Convert percentage to decimal
                
                StatisticsService.add_revenue_and_commission(
                    order_total=order_total,
                    commission_rate=commission_rate,
                    seller_id=seller_id
                )
            except Exception as e:
                print(f"Error adding to statistics: {e}")
                # Don't fail the order update if statistics fails
        
        return updated_order

    @staticmethod
    def seller_accept_order(order_id, seller_id):
        """Seller accepts order, generates tokens and QR codes."""
        try:
            order_obj_id = ObjectId(order_id)
            seller_obj_id = ObjectId(seller_id)
        except Exception:
            return None, "Invalid IDs"

        order = OrderService.get_order_by_id(order_id)
        if not order:
            return None, "Order not found"
        
        if order.status != 'pending_seller':
            return None, f"Order cannot be accepted. Current status: {order.status}"
        
        if str(order.seller_id) != str(seller_id):
            return None, "Order does not belong to this seller"

        # Generate secure tokens
        user_token = OrderService.generate_secure_token(
            str(order._id), str(order.seller_id), str(order.user_id), 'user'
        )
        seller_token = OrderService.generate_secure_token(
            str(order._id), str(order.seller_id), str(order.user_id), 'seller'
        )

        # Generate QR code data (tokens will be used for scanning)
        qr_data_user = f"BBHC|ORDER:{order.order_number}|TOKEN:{user_token}"
        qr_data_seller = f"BBHC|ORDER:{order.order_number}|TOKEN:{seller_token}"

        # Update order
        result = mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'seller_accepted',
                    'secure_token_user': user_token,
                    'secure_token_seller': seller_token,
                    'qr_code_data': qr_data_user,
                    'updated_at': datetime.utcnow()
                },
                '$push': {
                    'status_history': {
                        'status': 'seller_accepted',
                        'timestamp': datetime.utcnow(),
                        'note': 'Seller accepted the order',
                        'updated_by': f'seller:{seller_id}'
                    }
                }
            }
        )

        if result.matched_count == 0:
            return None, "Failed to update order"

        updated_order = OrderService.get_order_by_id(order_id)
        return updated_order, None

    @staticmethod
    def seller_reject_order(order_id, seller_id, reason):
        """Seller rejects order."""
        try:
            order_obj_id = ObjectId(order_id)
            seller_obj_id = ObjectId(seller_id)
        except Exception:
            return None, "Invalid IDs"

        if not reason or not reason.strip():
            return None, "Rejection reason is required"

        order = OrderService.get_order_by_id(order_id)
        if not order:
            return None, "Order not found"
        
        if order.status != 'pending_seller':
            return None, f"Order cannot be rejected. Current status: {order.status}"
        
        if str(order.seller_id) != str(seller_id):
            return None, "Order does not belong to this seller"

        # Restore product quantity
        OrderService.restore_product_quantity(str(order.product_id), order.quantity)

        # Update order with rejection reason
        result = mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'seller_rejected',
                    'rejection_reason': reason.strip(),
                    'rejected_by': f'seller:{seller_id}',
                    'updated_at': datetime.utcnow()
                },
                '$push': {
                    'status_history': {
                        'status': 'seller_rejected',
                        'timestamp': datetime.utcnow(),
                        'note': f'Seller rejected: {reason.strip()}',
                        'updated_by': f'seller:{seller_id}'
                    }
                }
            }
        )

        if result.matched_count == 0:
            return None, "Failed to update order"

        updated_order = OrderService.get_order_by_id(order_id)
        return updated_order, None

    @staticmethod
    def scan_token(token, scanner_role, scanner_id):
        """Scan QR token and update order status based on role and current state."""
        order = OrderService.get_order_by_token(token)
        if not order:
            return None, "Invalid token or order not found"

        # Check if token is already used
        if scanner_role == 'user' and order.token_used_user:
            return None, "This token has already been used"
        if scanner_role == 'seller' and order.token_used_seller:
            return None, "This token has already been used"

        # Validate token matches role
        if scanner_role == 'user' and order.secure_token_user != token:
            return None, "Invalid token for user"
        if scanner_role == 'seller' and order.secure_token_seller != token:
            return None, "Invalid token for seller"

        try:
            order_obj_id = order._id
            updates = {}
            
            if scanner_role == 'seller':
                # Seller scans at outlet - mark as handed over
                if order.status == 'seller_accepted':
                    updates['status'] = 'handed_over'
                    updates['token_used_seller'] = True
                    updates['$push'] = {
                        'status_history': {
                            'status': 'handed_over',
                            'timestamp': datetime.utcnow(),
                            'note': 'Seller handed over product at outlet',
                            'updated_by': f'seller:{scanner_id}'
                        }
                    }
                else:
                    return None, f"Cannot scan. Order status: {order.status}"

            elif scanner_role == 'user':
                # User scans at outlet
                if order.status == 'handed_over':
                    # Seller has handed over, user can complete
                    updates['status'] = 'completed'
                    updates['token_used_user'] = True
                    updates['$push'] = {
                        'status_history': {
                            'status': 'completed',
                            'timestamp': datetime.utcnow(),
                            'note': 'User collected product and completed order',
                            'updated_by': f'user:{scanner_id}'
                        }
                    }
                elif order.status == 'seller_accepted':
                    # Seller hasn't handed over yet
                    return None, "Seller has not handed over the product yet. Please wait."
                else:
                    return None, f"Cannot scan. Order status: {order.status}"

            elif scanner_role == 'outlet':
                # Outlet can scan either token
                if order.status == 'seller_accepted' and order.secure_token_seller == token:
                    # Outlet scanning seller token = seller handed over
                    updates['status'] = 'handed_over'
                    updates['token_used_seller'] = True
                    updates['$push'] = {
                        'status_history': {
                            'status': 'handed_over',
                            'timestamp': datetime.utcnow(),
                            'note': 'Outlet confirmed seller handed over',
                            'updated_by': f'outlet:{scanner_id}'
                        }
                    }
                elif order.status == 'handed_over' and order.secure_token_user == token:
                    # Outlet scanning user token = user completed
                    updates['status'] = 'completed'
                    updates['token_used_user'] = True
                    updates['$push'] = {
                        'status_history': {
                            'status': 'completed',
                            'timestamp': datetime.utcnow(),
                            'note': 'Outlet confirmed user collected',
                            'updated_by': f'outlet:{scanner_id}'
                        }
                    }
                else:
                    return None, f"Cannot process scan. Order status: {order.status}"

            if not updates:
                return None, "No action to perform"

            # Remove $push from updates for $set
            push_data = updates.pop('$push', None)
            updates['updated_at'] = datetime.utcnow()

            update_doc = {'$set': updates}
            if push_data:
                update_doc['$push'] = push_data

            result = mongo.db.orders.update_one(
                {'_id': order_obj_id},
                update_doc
            )

            if result.matched_count == 0:
                return None, "Failed to update order"

            updated_order = OrderService.get_order_by_id(str(order._id))
            return updated_order, None

        except Exception as e:
            return None, f"Error processing scan: {str(e)}"

    @staticmethod
    def master_cancel_order(order_id, master_id, confirmation_code, reason):
        """Master cancels order with confirmation code and reason."""
        try:
            order_obj_id = ObjectId(order_id)
        except Exception:
            return None, "Invalid order ID"

        if not reason or not reason.strip():
            return None, "Rejection reason is required"

        order = OrderService.get_order_by_id(order_id)
        if not order:
            return None, "Order not found"

        # Verify confirmation code (should match the one shown to master)
        # In practice, you'd generate and store this code temporarily
        # For now, we'll accept any non-empty code as confirmation

        # Restore product quantity if order was accepted
        if order.status in ['seller_accepted', 'ready_for_pickup', 'handed_over']:
            OrderService.restore_product_quantity(str(order.product_id), order.quantity)

        # Generate cancellation code for audit
        cancellation_code = secrets.token_urlsafe(8).upper()

        result = mongo.db.orders.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'cancelled_master',
                    'cancelled_by_master': True,
                    'cancellation_code': cancellation_code,
                    'rejection_reason': reason.strip(),
                    'rejected_by': f'master:{master_id}',
                    'updated_at': datetime.utcnow()
                },
                '$push': {
                    'status_history': {
                        'status': 'cancelled_master',
                        'timestamp': datetime.utcnow(),
                        'note': f'Cancelled by master (confirmation: {confirmation_code}, reason: {reason.strip()})',
                        'updated_by': f'master:{master_id}'
                    }
                }
            }
        )

        if result.matched_count == 0:
            return None, "Failed to cancel order"

        updated_order = OrderService.get_order_by_id(order_id)
        return updated_order, None

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

        status = order_doc.get('status', 'pending_seller')
        if status not in ['pending_seller']:
            return None, "Order cannot be cancelled at this stage"

        # Restore product quantity
        OrderService.restore_product_quantity(str(order_doc['product_id']), order_doc['quantity'])

        updated_order = OrderService.update_order_status(
            order_id,
            'cancelled',
            note='Cancelled by user',
            updated_by=f'user:{user_id}'
        )
        return updated_order, None
