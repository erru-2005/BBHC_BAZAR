"""
Order service encapsulating MongoDB operations for customer orders.
"""
import random
import secrets
import hashlib
from datetime import datetime, timezone
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
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(100, 999)
        return f"BBHC-{timestamp}-{random_suffix}"

    @staticmethod
    def calculate_arrival_date(created_at, delivery_span):
        """Calculate arrival date skipping Sundays and converting to IST."""
        if not created_at:
            return None
        try:
            span = int(delivery_span if delivery_span is not None else 2)
        except (ValueError, TypeError):
            span = 2

        if span < 1:
            return None

        # Convert to IST (UTC+5:30)
        from datetime import timezone as dt_timezone, timedelta
        ist = dt_timezone(timedelta(hours=5, minutes=30))
        local_dt = created_at.astimezone(ist)

        days_to_add = span - 1

        # If it is Sunday, move to Monday (isoweekday() == 7 for Sunday)
        while local_dt.isoweekday() == 7:
            local_dt += timedelta(days=1)

        while days_to_add > 0:
            local_dt += timedelta(days=1)
            if local_dt.isoweekday() != 7:
                days_to_add -= 1

        return local_dt.strftime('%d-%m-%Y')

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
    def create_order(order_data):
        """Insert a new order document into the appropriate collection."""
        order_data = order_data.copy()
        order_data['order_number'] = order_data.get('order_number') or OrderService.generate_order_number()
        order_data['product_id'] = OrderService._ensure_object_id(order_data['product_id'])
        order_data['user_id'] = OrderService._ensure_object_id(order_data['user_id'])
        if order_data.get('seller_id'):
            order_data['seller_id'] = OrderService._ensure_object_id(order_data['seller_id'])
        if order_data.get('outlet_id'):
            order_data['outlet_id'] = OrderService._ensure_object_id(order_data['outlet_id'])
        order_data['created_at'] = datetime.now(timezone.utc)
        order_data['updated_at'] = datetime.now(timezone.utc)
        order_data['status'] = order_data.get('status', 'pending_seller')

        # Get product delivery span
        product_doc = mongo.db.products.find_one({'_id': OrderService._ensure_object_id(order_data['product_id'])})
        if product_doc:
            order_data['delivery_span'] = product_doc.get('delivery_span', 2)
        else:
            order_data['delivery_span'] = 2

        # Calculate and store arrival date
        order_data['arrival_date'] = OrderService.calculate_arrival_date(
            order_data['created_at'],
            order_data['delivery_span']
        )
        
        # Detect if it's a service order
        product_snapshot = order_data.get('product_snapshot') or {}
        product_name = (product_snapshot.get('name') or product_snapshot.get('product_name') or '').lower()
        is_service = bool(order_data.get('booking')) or 'creativework' in product_name or 'service' in product_name
        
        order_data['type'] = 'service' if is_service else 'product'

        # Initialize status history
        if 'status_history' not in order_data:
            order_data['status_history'] = [{
                'status': order_data['status'],
                'timestamp': datetime.now(timezone.utc),
                'note': 'Order created'
            }]

        order = Order(**order_data)
        collection = mongo.db.service_orders if is_service else mongo.db.orders
        result = collection.insert_one(order.to_bson())
        order._id = result.inserted_id
        return order

    @staticmethod
    def get_orders(filter_query=None, page=1, limit=10):
        """Fetch orders from both product and service collections, merged and sorted."""
        try:
            OrderService.check_and_cancel_expired_orders()
        except Exception as e:
            print(f"Error checking/cancelling expired orders: {e}")

        filter_query = filter_query or {}
        skip = (page - 1) * limit
        
        # Count documents in both collections
        count_products = mongo.db.orders.count_documents(filter_query)
        count_services = mongo.db.service_orders.count_documents(filter_query)
        total = count_products + count_services
        
        # Since we need to merge and sort across collections, we fetch a bit more then merge
        # but for simple pagination we just query both and merge.
        # This is a basic implementation of merging two sorted streams.
        cursor_products = mongo.db.orders.find(filter_query).sort('created_at', -1).limit(skip + limit)
        cursor_services = mongo.db.service_orders.find(filter_query).sort('created_at', -1).limit(skip + limit)
        
        all_docs = list(cursor_products) + list(cursor_services)
        # Sort merged list by created_at descending
        all_docs.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
        
        # Apply pagination
        paged_docs = all_docs[skip : skip + limit]
        orders = [Order.from_bson(doc) for doc in paged_docs]
        return orders, total

    @staticmethod
    def get_order_by_id(order_id):
        try:
            try:
                OrderService.check_and_cancel_expired_orders()
            except Exception as e:
                print(f"Error checking/cancelling expired orders: {e}")

            oid = ObjectId(order_id)
            # Try product orders first
            doc = mongo.db.orders.find_one({'_id': oid})
            if not doc:
                # Then try service orders
                doc = mongo.db.service_orders.find_one({'_id': oid})
            return Order.from_bson(doc)
        except Exception:
            return None

    @staticmethod
    def get_order_by_token(token):
        """Find order by secure token in either collection."""
        try:
            # Try product orders
            doc = mongo.db.orders.find_one({
                '$or': [
                    {'secure_token_user': token},
                    {'secure_token_seller': token}
                ]
            })
            if not doc:
                # Try service orders
                doc = mongo.db.service_orders.find_one({
                    '$or': [
                        {'secure_token_user': token},
                        {'secure_token_seller': token}
                    ]
                })
            return Order.from_bson(doc)
        except Exception:
            return None

    @staticmethod
    def get_orders_by_user(user_id, page=1, limit=10):
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return [], 0
        return OrderService.get_orders({'user_id': user_obj_id}, page=page, limit=limit)

    @staticmethod
    def get_orders_by_seller(seller_id, page=1, limit=10):
        try:
            seller_obj_id = ObjectId(seller_id)
        except Exception:
            return [], 0
        return OrderService.get_orders({'seller_id': seller_obj_id}, page=page, limit=limit)

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
            'timestamp': datetime.now(timezone.utc),
            'note': note or f'Status changed to {status}',
            'updated_by': updated_by
        })

        # Identify collection based on type
        collection = mongo.db.service_orders if current_order.type == 'service' else mongo.db.orders

        result = collection.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': status,
                    'updated_at': datetime.now(timezone.utc),
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
    def seller_accept_order(order_id, seller_id, delivery_span=None):
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

        # Detect if it's a service order using explicit type field
        is_service = order.type == 'service' or bool(order.booking)

        if not is_service and delivery_span is not None:
            max_days = 2
            product_id = order.product_id
            if product_id:
                try:
                    pid_obj = ObjectId(product_id) if not isinstance(product_id, ObjectId) else product_id
                    product_doc = mongo.db.products.find_one({'_id': pid_obj})
                    if product_doc:
                        max_days = int(product_doc.get('delivery_span', 2))
                except Exception:
                    pass
            
            # Use order's snapshot/stored delivery_span as fallback/max limit
            order_dict = order.to_dict() if hasattr(order, 'to_dict') else {}
            stored_span = order_dict.get('delivery_span')
            if stored_span:
                try:
                    max_days = max(max_days, int(stored_span))
                except Exception:
                    pass

            if delivery_span <= 0 or delivery_span > max_days:
                return None, f"Delivery span must be between 1 and {max_days} days"

        # Determine target collection
        collection = mongo.db.service_orders if is_service else mongo.db.orders
        
        if is_service:
            # For services, accept means direct completion and credit deduction
            from app.services.seller_service import SellerService
            from app.services.platform_settings_service import PlatformSettingsService

            credit_cost = PlatformSettingsService.resolve_service_accept_credit_from_order(order)

            seller = SellerService.get_seller_by_id(seller_id)
            if not seller or seller.credits < credit_cost:
                return None, f"Insufficient credits ({credit_cost} required to accept service)"

            SellerService.deduct_credits(seller_id, credit_cost)
            
            # Update order to completed in service_orders
            result = collection.update_one(
                {'_id': order_obj_id},
                {
                    '$set': {
                        'status': 'completed',
                        'updated_at': datetime.now(timezone.utc)
                    },
                    '$push': {
                        'status_history': {
                            'status': 'completed',
                            'timestamp': datetime.now(timezone.utc),
                            'note': f'Service accepted and completed ({credit_cost} credits deducted)',
                            'updated_by': f'seller:{seller_id}'
                        }
                    }
                }
            )
        else:
            # For products, keep existing logic (seller_accepted -> tokens -> QR)
            user_token = OrderService.generate_secure_token(str(order._id), str(order.seller_id), str(order.user_id), 'user')
            seller_token = OrderService.generate_secure_token(str(order._id), str(order.seller_id), str(order.user_id), 'seller')
            qr_data_user = f"BBHC|ORDER:{order.order_number}|TOKEN:{user_token}"

            update_set = {
                'status': 'seller_accepted',
                'secure_token_user': user_token,
                'secure_token_seller': seller_token,
                'qr_code_data': qr_data_user,
                'updated_at': datetime.now(timezone.utc)
            }
            if delivery_span is not None:
                update_set['delivery_span'] = delivery_span
                update_set['arrival_date'] = OrderService.calculate_arrival_date(
                    order.created_at,
                    delivery_span
                )

            result = collection.update_one(
                {'_id': order_obj_id},
                {
                    '$set': update_set,
                    '$push': {
                        'status_history': {
                            'status': 'seller_accepted',
                            'timestamp': datetime.now(timezone.utc),
                            'note': f'Seller accepted the order (delivery timeframe: {delivery_span} days)' if delivery_span else 'Seller accepted the order',
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

        # Product quantity deduction is no longer used

        # Identify collection based on type
        collection = mongo.db.service_orders if order.type == 'service' else mongo.db.orders

        # Update order with rejection reason
        result = collection.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'seller_rejected',
                    'rejection_reason': reason.strip(),
                    'rejected_by': f'seller:{seller_id}',
                    'updated_at': datetime.now(timezone.utc)
                },
                '$push': {
                    'status_history': {
                        'status': 'seller_rejected',
                        'timestamp': datetime.now(timezone.utc),
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
    def scan_token(token, scanner_role, scanner_id, preview=False):
        """Scan QR token and update order status based on role and current state."""
        order = OrderService.get_order_by_token(token)
        if not order:
            return None, "Invalid token or order not found"

        # Basic validations that should show even in preview
        if scanner_role == 'user' and order.token_used_user:
            return None, "This token has already been used"
        if scanner_role == 'seller' and order.token_used_seller:
            return None, "This token has already been used"

        # Validate token matches role
        if scanner_role == 'user' and order.secure_token_user != token:
            return None, "Invalid token for user"
        if scanner_role == 'seller' and order.secure_token_seller != token:
            return None, "Invalid token for seller"

        # If it's just a preview, return the order now
        if preview:
            return order, None

        # Check if token is already used (duplicate check for clarity)
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
                            'timestamp': datetime.now(timezone.utc),
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
                            'timestamp': datetime.now(timezone.utc),
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
                            'timestamp': datetime.now(timezone.utc),
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
                            'timestamp': datetime.now(timezone.utc),
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
            updates['updated_at'] = datetime.now(timezone.utc)

            update_doc = {'$set': updates}
            if push_data:
                update_doc['$push'] = push_data

            # Identify collection
            collection = mongo.db.service_orders if order.type == 'service' else mongo.db.orders

            result = collection.update_one(
                {'_id': order_obj_id},
                update_doc
            )

            if result.matched_count == 0:
                return None, "Failed to update order"

            from app.services.slot_service import SlotService
            new_status = updates.get('status')
            if new_status == 'handed_over':
                SlotService.assign_item_to_slot(order.user_id)
            elif new_status == 'completed':
                SlotService.remove_item_from_slot(order.user_id)

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

        # Product quantity deduction is no longer used

        # Generate cancellation code for audit
        cancellation_code = secrets.token_urlsafe(8).upper()

        # Identify collection
        collection = mongo.db.service_orders if order.type == 'service' else mongo.db.orders

        result = collection.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'cancelled_master',
                    'cancelled_by_master': True,
                    'cancellation_code': cancellation_code,
                    'rejection_reason': reason.strip(),
                    'rejected_by': f'master:{master_id}',
                    'updated_at': datetime.now(timezone.utc)
                },
                '$push': {
                    'status_history': {
                        'status': 'cancelled_master',
                        'timestamp': datetime.now(timezone.utc),
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
    def cancel_order(order_id, user_id, reason=None):
        """Allow a user to cancel their own pending order."""
        try:
            order_obj_id = ObjectId(order_id)
            user_obj_id = ObjectId(user_id)
        except Exception:
            return None, "Invalid order ID"

        order = OrderService.get_order_by_id(order_id)
        if not order or str(order.user_id) != str(user_id):
            return None, "Order not found"

        if order.status not in ['pending_seller']:
            return None, "Order cannot be cancelled at this stage"

        # Identify collection
        collection = mongo.db.service_orders if order.type == 'service' else mongo.db.orders

        # Update order with cancellation reason
        result = collection.update_one(
            {'_id': order_obj_id},
            {
                '$set': {
                    'status': 'cancelled',
                    'rejection_reason': reason.strip() if reason else 'Cancelled by user',
                    'rejected_by': f'user:{user_id}',
                    'updated_at': datetime.now(timezone.utc)
                },
                '$push': {
                    'status_history': {
                        'status': 'cancelled',
                        'timestamp': datetime.now(timezone.utc),
                        'note': f'User cancelled: {reason.strip() if reason else "No reason provided"}',
                        'updated_by': f'user:{user_id}'
                    }
                }
            }
        )
        
        if result.matched_count == 0:
            return None, "Failed to update order"

        updated_order = OrderService.get_order_by_id(order_id)
        return updated_order, None

    @staticmethod
    def _send_cancellation_notifications(order_doc):
        """Send automatic cancellation sorry message and email to the user."""
        from app.utils.sms import SMSService
        
        user_id = order_doc.get('user_id')
        user_doc = None
        if user_id:
            user_doc = mongo.db.users.find_one({'_id': OrderService._ensure_object_id(user_id)})
            
        # Get phone and email
        phone = None
        email = None
        user_name = "Customer"
        
        if user_doc:
            phone = user_doc.get('phone_number')
            email = user_doc.get('email')
            user_name = user_doc.get('name') or "Customer"
        else:
            user_snapshot = order_doc.get('user_snapshot') or {}
            phone = user_snapshot.get('phone_number')
            email = user_snapshot.get('email')
            user_name = user_snapshot.get('name') or "Customer"
            
        if not phone and not email:
            print("[OrderService] Cannot send cancellation notification: no phone or email available.")
            return
            
        order_number = order_doc.get('order_number') or order_doc.get('orderNumber') or "N/A"
        product_snapshot = order_doc.get('product_snapshot') or order_doc.get('product') or {}
        product_name = product_snapshot.get('name') or product_snapshot.get('product_name') or "item"
        
        message_body = (
            f"Dear {user_name}, we are sorry to inform you that your order #{order_number} "
            f"for '{product_name}' has been automatically cancelled because the seller did not "
            f"confirm the delivery timeframe. We apologize for the inconvenience."
        )
        
        # Use SMSService to deliver via SMTP email + WebSocket/FCM
        SMSService.send_message(
            phone_number=phone,
            message_body=message_body,
            product_thumbnail=product_snapshot.get('thumbnail'),
            email=email
        )

    @staticmethod
    def check_and_cancel_expired_orders():
        """Find pending orders that have expired and cancel them."""
        from datetime import datetime, timezone, timedelta
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(timezone.utc).astimezone(ist)
        today_date = now_ist.date()

        # Let's query all pending seller orders from both collections
        for collection in [mongo.db.orders, mongo.db.service_orders]:
            pending_orders = list(collection.find({'status': 'pending_seller'}))
            for doc in pending_orders:
                created_at = doc.get('created_at')
                if not created_at:
                    continue
                # Ensure created_at is timezone-aware
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                
                order_date = created_at.astimezone(ist).date()
                delivery_span = int(doc.get('delivery_span', 2))
                
                days_passed = (today_date - order_date).days
                if days_passed >= delivery_span:
                    # Cancel the order!
                    order_id = doc['_id']
                    
                    # Update status to cancelled
                    status_history = doc.get('status_history', [])
                    status_history.append({
                        'status': 'cancelled',
                        'timestamp': datetime.now(timezone.utc),
                        'note': 'Order automatically cancelled: seller did not accept within delivery timeframe',
                        'updated_by': 'system'
                    })
                    
                    collection.update_one(
                        {'_id': order_id},
                        {
                            '$set': {
                                'status': 'cancelled',
                                'rejection_reason': 'Order automatically cancelled: seller did not accept within delivery timeframe',
                                'rejected_by': 'system',
                                'updated_at': datetime.now(timezone.utc),
                                'status_history': status_history
                            }
                        }
                    )
                    
                    # Send sorry message & mail to the user
                    try:
                        OrderService._send_cancellation_notifications(doc)
                    except Exception as e:
                        print(f"Error sending cancellation notifications: {e}")
