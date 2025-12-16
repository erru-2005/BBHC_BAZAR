"""
Order-related API endpoints.
"""
import secrets
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.services.product_service import ProductService
from app.services.order_service import OrderService
from app.services.user_service import UserService
from app.services.seller_service import SellerService
from app.sockets.emitter import emit_order_event
from app.utils.sms import SMSService

orders_bp = Blueprint('orders', __name__)


def _serialize_orders(order_list):
    """Serialize orders and populate current product/user/seller data from IDs"""
    from app.services.product_service import ProductService
    from app.services.user_service import UserService
    from app.services.seller_service import SellerService
    
    serialized = []
    for order in order_list:
        if not order:
            continue
        order_dict = order.to_dict()
        
        # Populate current product data (snapshot is kept for historical reference)
        if order.product_id:
            product = ProductService.get_product_by_id(str(order.product_id))
            if product:
                product_dict = product.to_dict()
                order_dict['product_current'] = {
                    'id': product_dict.get('id'),
                    'product_name': product_dict.get('product_name'),
                    'thumbnail': product_dict.get('thumbnail'),
                    'selling_price': product_dict.get('selling_price'),
                    'max_price': product_dict.get('max_price'),
                    'quantity': product_dict.get('quantity'),
                }
        
        # Populate current user data
        if order.user_id:
            user = UserService.get_user_by_id(str(order.user_id))
            if user:
                user_dict = user.to_dict(include_password=False)
                order_dict['user_current'] = {
                    'id': user_dict.get('id'),
                    'name': f"{(user_dict.get('first_name') or '').strip()} {(user_dict.get('last_name') or '').strip()}".strip() or user_dict.get('username'),
                    'email': user_dict.get('email'),
                    'phone': user_dict.get('phone_number'),
                    'address': user_dict.get('address'),
                }
        
        # Populate current seller data
        if order.seller_id:
            seller = SellerService.get_seller_by_id(str(order.seller_id))
            if seller:
                seller_dict = seller.to_dict(include_password=False)
                order_dict['seller_current'] = seller_dict
        
        serialized.append(order_dict)
    
    return serialized


@orders_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    claims = get_jwt()
    if claims.get('user_type') != 'user':
        return jsonify({'error': 'Only customers can place orders'}), 403

    payload = request.get_json() or {}
    product_id = payload.get('product_id')
    quantity = int(payload.get('quantity', 1))
    delivery_address = (payload.get('delivery_address') or '').strip()

    if not product_id:
        return jsonify({'error': 'Product ID is required'}), 400
    if quantity <= 0:
        return jsonify({'error': 'Quantity must be greater than zero'}), 400

    product = ProductService.get_product_by_id(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    product_dict = product.to_dict()
    available_quantity = product_dict.get('quantity')
    if available_quantity is None:
        available_quantity = (
            product_dict.get('available_quantity')
            or product_dict.get('inventory')
            or product_dict.get('stock')
        )
    if available_quantity is not None:
        try:
            available_quantity = int(available_quantity)
        except Exception:
            available_quantity = None

    if available_quantity is not None:
        if available_quantity <= 0:
            return jsonify({'error': 'Product is currently out of stock'}), 400
        if quantity > available_quantity:
            quantity = available_quantity

    # Atomically reduce product quantity
    if not OrderService.reduce_product_quantity(product_id, quantity):
        return jsonify({'error': 'Insufficient stock. Product quantity could not be reduced.'}), 400

    unit_price = product_dict.get('selling_price') or product_dict.get('max_price') or 0
    total_amount = float(unit_price or 0) * quantity

    user_id = get_jwt_identity()
    user = UserService.get_user_by_id(user_id)
    user_snapshot = user.to_dict(include_password=False) if user else {}

    seller_snapshot = {}
    seller_id = None
    seller_trade_id = product_dict.get('seller_trade_id')
    if seller_trade_id:
        seller = SellerService.get_seller_by_trade_id(seller_trade_id, include_blacklisted=True)
        if seller:
            seller_snapshot = seller.to_dict(include_password=False)
            seller_id = seller_snapshot.get('id')
            seller_phone = seller_snapshot.get('phone_number')
        else:
            seller_phone = None
    else:
        seller_phone = None

    pickup_location = payload.get('pickup_location') or 'BBHCBazaar Experience Outlet'
    pickup_instructions = (
        payload.get('pickup_instructions')
        or 'Show the QR code at the BBHCBazaar outlet to pay and collect your product.'
    )

    order_payload = {
        'product_id': product_dict.get('id'),
        'user_id': user_id,
        'seller_id': seller_id,
        'quantity': quantity,
        'unit_price': unit_price,
        'total_amount': total_amount,
        'status': 'pending_seller',
        'delivery_address': delivery_address or user_snapshot.get('address'),
        'pickup_location': pickup_location,
        'pickup_instructions': pickup_instructions,
        'product_snapshot': {
            'id': product_dict.get('id'),
            'name': product_dict.get('product_name'),
            'thumbnail': product_dict.get('thumbnail'),
            'price': unit_price,
            'sellerTradeId': seller_trade_id,
            'availableQuantity': available_quantity
        },
        'user_snapshot': {
            'id': user_snapshot.get('id'),
            'name': f"{(user_snapshot.get('first_name') or '').strip()} {(user_snapshot.get('last_name') or '').strip()}".strip() or user_snapshot.get('username'),
            'email': user_snapshot.get('email'),
            'phone': user_snapshot.get('phone_number'),
            'address': user_snapshot.get('address')
        },
        'seller_snapshot': seller_snapshot,
        'metadata': {
            'source': payload.get('source') or 'buy_now',
            'platform': payload.get('platform') or 'web',
            'device': payload.get('device') or 'browser'
        }
    }

    order = OrderService.create_order(order_payload)
    order_dict = order.to_dict()

    # Emit real-time events to user, seller, and master
    emit_order_event('new_order', order_dict, target_user_id=user_id, target_seller_id=seller_id)

    # Notify seller via SMS (best-effort)
    try:
        if seller_id and seller_phone and SMSService.is_configured():
            # Use product_dict directly for accurate data
            product_name = product_dict.get('product_name') or 'Product'
            qty = quantity
            order_no = order_dict.get('orderNumber') or order_dict.get('order_number') or order_dict.get('id')
            # Use the calculated values from order creation
            unit_price_val = float(unit_price or 0)
            total_amount_val = float(total_amount or 0)
            message_body = (
                f"New order #{order_no}: {product_name} (Qty: {qty}, ₹{total_amount_val:.2f}). "
                "Visit BBHCBazaar seller dashboard to accept/reject."
            )
            SMSService.send_message(seller_phone, message_body)
    except Exception as e:
        # Don't block order creation on SMS failure
        print(f"Failed to send SMS notification to seller: {str(e)}")

    return jsonify({
        'message': 'Order placed successfully',
        'order': order_dict
    }), 201


@orders_bp.route('/orders', methods=['GET'])
@jwt_required()
def list_orders():
    claims = get_jwt()
    user_type = claims.get('user_type')
    user_id = get_jwt_identity()

    if user_type == 'master':
        orders = OrderService.get_orders()
    elif user_type == 'outlet_man':
        orders = OrderService.get_orders()
    elif user_type == 'seller':
        orders = OrderService.get_orders_by_seller(user_id)
    elif user_type == 'user':
        orders = OrderService.get_orders_by_user(user_id)
    else:
        return jsonify({'error': f'Unauthorized to view orders. User type: {user_type}'}), 403

    return jsonify({'orders': _serialize_orders(orders)}), 200


@orders_bp.route('/orders/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """Get a specific order by ID with populated current data."""
    claims = get_jwt()
    user_type = claims.get('user_type')
    user_id = get_jwt_identity()

    order = OrderService.get_order_by_id(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    # Authorization checks
    if user_type == 'user' and str(order.user_id) != str(user_id):
        return jsonify({'error': 'Unauthorized'}), 403
    if user_type == 'seller' and str(order.seller_id) != str(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    # Populate current data from IDs
    order_dict = order.to_dict()
    
    # Populate current product data
    if order.product_id:
        product = ProductService.get_product_by_id(str(order.product_id))
        if product:
            product_dict = product.to_dict()
            order_dict['product_current'] = {
                'id': product_dict.get('id'),
                'product_name': product_dict.get('product_name'),
                'thumbnail': product_dict.get('thumbnail'),
                'selling_price': product_dict.get('selling_price'),
                'max_price': product_dict.get('max_price'),
                'quantity': product_dict.get('quantity'),
            }
    
    # Populate current user data
    if order.user_id:
        user = UserService.get_user_by_id(str(order.user_id))
        if user:
            user_dict = user.to_dict(include_password=False)
            order_dict['user_current'] = {
                'id': user_dict.get('id'),
                'name': f"{(user_dict.get('first_name') or '').strip()} {(user_dict.get('last_name') or '').strip()}".strip() or user_dict.get('username'),
                'email': user_dict.get('email'),
                'phone': user_dict.get('phone_number'),
                'address': user_dict.get('address'),
            }
    
    # Populate current seller data
    if order.seller_id:
        seller = SellerService.get_seller_by_id(str(order.seller_id))
        if seller:
            seller_dict = seller.to_dict(include_password=False)
            order_dict['seller_current'] = seller_dict

    return jsonify({'order': order_dict}), 200


@orders_bp.route('/orders/<order_id>/accept', methods=['POST'])
@jwt_required()
def seller_accept_order(order_id):
    """Seller accepts an order."""
    claims = get_jwt()
    if claims.get('user_type') != 'seller':
        return jsonify({'error': 'Only sellers can accept orders'}), 403

    seller_id = get_jwt_identity()
    updated_order, error = OrderService.seller_accept_order(order_id, seller_id)
    
    if error:
        return jsonify({'error': error}), 400
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    # Send SMS notification to user
    try:
        user = UserService.get_user_by_id(str(updated_order.user_id))
        if user and user.phone_number:
            # Use order object directly for accurate data
            product_snapshot = updated_order.product_snapshot or {}
            product_name = product_snapshot.get('name') or 'Product'
            order_number = updated_order.order_number or order_id
            quantity = updated_order.quantity or 1
            message = f"Order #{order_number} accepted! {product_name} (Qty: {quantity}). Visit BBHCBazaar site for details."
            SMSService.send_message(user.phone_number, message)
    except Exception as e:
        # Don't fail the request if SMS fails
        print(f"Failed to send SMS notification to user: {str(e)}")

    return jsonify({
        'message': 'Order accepted successfully',
        'order': order_dict
    }), 200


@orders_bp.route('/orders/<order_id>/reject', methods=['POST'])
@jwt_required()
def seller_reject_order(order_id):
    """Seller rejects an order."""
    claims = get_jwt()
    if claims.get('user_type') != 'seller':
        return jsonify({'error': 'Only sellers can reject orders'}), 403

    seller_id = get_jwt_identity()
    payload = request.get_json() or {}
    reason = payload.get('reason', '').strip()

    if not reason:
        return jsonify({'error': 'Rejection reason is required'}), 400

    updated_order, error = OrderService.seller_reject_order(order_id, seller_id, reason)
    
    if error:
        return jsonify({'error': error}), 400
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    # Send SMS notification to user
    try:
        user = UserService.get_user_by_id(str(updated_order.user_id))
        if user and user.phone_number:
            # Use order object directly for accurate data
            product_snapshot = updated_order.product_snapshot or {}
            product_name = product_snapshot.get('name') or 'Product'
            order_number = updated_order.order_number or order_id
            quantity = updated_order.quantity or 1
            rejection_reason = updated_order.rejection_reason or reason
            message = f"Order #{order_number} rejected: {product_name} (Qty: {quantity}). Reason: {rejection_reason}. Visit BBHCBazaar site for details."
            SMSService.send_message(user.phone_number, message)
    except Exception as e:
        # Don't fail the request if SMS fails
        print(f"Failed to send SMS notification to user: {str(e)}")

    return jsonify({
        'message': 'Order rejected successfully',
        'order': order_dict
    }), 200


@orders_bp.route('/orders/scan', methods=['POST'])
@jwt_required()
def scan_order_token():
    """Scan QR token to update order status."""
    claims = get_jwt()
    user_type = claims.get('user_type')
    scanner_id = get_jwt_identity()

    payload = request.get_json() or {}
    token = payload.get('token', '').strip()

    if not token:
        return jsonify({'error': 'Token is required'}), 400

    # Determine scanner role
    scanner_role = None
    if user_type == 'seller':
        scanner_role = 'seller'
    elif user_type == 'user':
        scanner_role = 'user'
    elif user_type == 'outlet_man':
        scanner_role = 'outlet'
    else:
        return jsonify({'error': 'Unauthorized to scan tokens'}), 403

    updated_order, error = OrderService.scan_token(token, scanner_role, scanner_id)
    
    if error:
        return jsonify({'error': error}), 400
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    order_status = order_dict.get('status')
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    # Send SMS notifications based on status change
    try:
        # Use order object directly for accurate data (more reliable than order_dict)
        product_snapshot = updated_order.product_snapshot or {}
        product_name = product_snapshot.get('name') or 'Product'
        order_number = updated_order.order_number or str(updated_order._id)
        quantity = updated_order.quantity or 1
        total_amount = float(updated_order.total_amount or 0)

        if order_status == 'handed_over':
            # Seller handed over product - notify user to collect
            user = UserService.get_user_by_id(str(updated_order.user_id))
            if user and user.phone_number:
                pickup_location = updated_order.pickup_location or 'BBHCBazaar Experience Outlet'
                message = f"Order #{order_number}: {product_name} (Qty: {quantity}) ready for pickup at {pickup_location}. Visit BBHCBazaar outlet with your QR code to collect."
                SMSService.send_message(user.phone_number, message)

        elif order_status == 'completed':
            # User collected product - notify seller
            seller = SellerService.get_seller_by_id(str(updated_order.seller_id))
            if seller and seller.phone_number:
                message = f"Order #{order_number} completed! {product_name} (Qty: {quantity}) collected. Total: ₹{total_amount:.2f}. Thanks!"
                SMSService.send_message(seller.phone_number, message)
    except Exception as e:
        # Don't fail the request if SMS fails
        print(f"Failed to send SMS notification: {str(e)}")

    return jsonify({
        'message': 'Token scanned successfully',
        'order': order_dict
    }), 200


@orders_bp.route('/orders/<order_id>/cancel-master', methods=['POST'])
@jwt_required()
def master_cancel_order(order_id):
    """Master cancels an order with confirmation code and reason."""
    claims = get_jwt()
    if claims.get('user_type') != 'master':
        return jsonify({'error': 'Only masters can cancel orders'}), 403

    master_id = get_jwt_identity()
    payload = request.get_json() or {}
    confirmation_code = payload.get('confirmation_code', '').strip()
    reason = payload.get('reason', '').strip()

    if not confirmation_code:
        return jsonify({'error': 'Confirmation code is required'}), 400
    
    if not reason:
        return jsonify({'error': 'Rejection reason is required'}), 400

    updated_order, error = OrderService.master_cancel_order(order_id, master_id, confirmation_code, reason)
    
    if error:
        return jsonify({'error': error}), 400
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    # Send SMS notifications to user and seller
    try:
        product_snapshot = updated_order.product_snapshot or {}
        product_name = product_snapshot.get('name') or 'Product'
        order_number = updated_order.order_number or order_id
        quantity = updated_order.quantity or 1
        rejection_reason = updated_order.rejection_reason or reason

        # Notify user
        user = UserService.get_user_by_id(str(updated_order.user_id))
        if user and user.phone_number:
            message = f"Order #{order_number} cancelled: {product_name} (Qty: {quantity}). Reason: {rejection_reason}. Visit BBHCBazaar site for details."
            SMSService.send_message(user.phone_number, message)

        # Notify seller
        if updated_order.seller_id:
            seller = SellerService.get_seller_by_id(str(updated_order.seller_id))
            if seller and seller.phone_number:
                message = f"Order #{order_number} cancelled by admin: {product_name} (Qty: {quantity}). Reason: {rejection_reason}."
                SMSService.send_message(seller.phone_number, message)
    except Exception as e:
        # Don't fail the request if SMS fails
        print(f"Failed to send SMS notification: {str(e)}")

    return jsonify({
        'message': 'Order cancelled by master successfully',
        'order': order_dict
    }), 200


@orders_bp.route('/orders/<order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    claims = get_jwt()
    if claims.get('user_type') != 'user':
        return jsonify({'error': 'Only customers can cancel orders'}), 403

    user_id = get_jwt_identity()
    updated_order, error = OrderService.cancel_order(order_id, user_id)
    if error:
        return jsonify({'error': error}), 400
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    return jsonify({
        'message': 'Order cancelled successfully',
        'order': order_dict
    }), 200


@orders_bp.route('/orders/<order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    claims = get_jwt()
    user_type = claims.get('user_type')
    if user_type not in ['master', 'outlet_man']:
        return jsonify({'error': 'Only masters and outlet men can update order status'}), 403

    data = request.get_json() or {}
    status = data.get('status')
    note = data.get('note')
    updated_by = f'{user_type}:{get_jwt_identity()}'

    if status not in OrderService.STATUS_CHOICES:
        return jsonify({'error': 'Invalid status value'}), 400

    updated_order = OrderService.update_order_status(order_id, status, note=note, updated_by=updated_by)
    if not updated_order:
        return jsonify({'error': 'Order not found'}), 404

    order_dict = updated_order.to_dict()
    emit_order_event('order_updated', order_dict, target_user_id=str(updated_order.user_id), target_seller_id=str(updated_order.seller_id))

    return jsonify({
        'message': 'Order status updated',
        'order': order_dict
    }), 200
