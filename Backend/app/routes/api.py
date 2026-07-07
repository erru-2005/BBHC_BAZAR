"""
Simple API route - Welcome endpoint
"""
from flask import Blueprint, jsonify, request
import os
import uuid
from werkzeug.utils import secure_filename
from flask import send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from marshmallow import ValidationError
from app.schemas.registration_schemas import MasterRegistrationSchema, SellerRegistrationSchema
from app.schemas.product_service_schemas import ProductCreationSchema
from app.services.master_service import MasterService
from app.services.seller_service import SellerService
from app.services.outlet_man_service import OutletManService
from app.services.blacklist_service import BlacklistService
from app.services.category_service import CategoryService
from app.services.product_service import ProductService
from app.services.wishlist_service import WishlistService
from app import mongo
from app.sockets.emitter import emit_product_event
from app.utils.validators import validate_email
from datetime import datetime, timezone

api_bp = Blueprint('api', __name__)

_SELLER_PRIVATE_FIELDS = ('seller_name', 'seller_email', 'seller_phone', 'seller_phone_number')


def _is_master_request():
    """Return True only when request is authenticated as master."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt() or {}
        return claims.get('user_type') == 'master'
    except Exception:
        return False


def _sanitize_product_seller_fields(product_dict):
    """Remove seller private profile fields from product payload."""
    for private_key in _SELLER_PRIVATE_FIELDS:
        product_dict.pop(private_key, None)
    return product_dict


def _resolve_seller_for_master_product(data):
    """
    Resolve seller from trade id and/or Mongo id sent by master add-product form.
    Masters may assign products to blacklisted sellers for administrative fixes.
    """
    identifiers = []
    for key in ('seller_trade_id', 'seller_id', 'created_by_user_id'):
        value = data.get(key)
        if value is not None and str(value).strip():
            identifiers.append(str(value).strip())

    seen = set()
    for identifier in identifiers:
        if identifier in seen:
            continue
        seen.add(identifier)
        seller = SellerService.resolve_seller(identifier, include_blacklisted=True)
        if seller:
            return seller
    return None


def _seller_profile_fields(seller):
    """Build seller_* fields for product payloads from a Seller model."""
    full_name = ' '.join(
        part for part in [seller.first_name, seller.last_name] if part
    ).strip()
    return {
        'seller_trade_id': seller.trade_id,
        'seller_name': full_name or seller.trade_id,
        'seller_email': seller.email,
        'seller_phone': seller.phone_number,
        'created_by_user_id': str(seller._id),
        'created_by_user_type': 'seller',
    }


@api_bp.route('/', methods=['GET'])
def welcome():
    """Welcome endpoint"""
    return jsonify({
        'message': 'Welcome to BBHCBazaar API'
    }), 200


@api_bp.route('/register_master', methods=['POST'])
@jwt_required()
def register_master():
    """Register a new master"""
    try:
        data = request.get_json()
        
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
            
        try:
            schema = MasterRegistrationSchema()
            data = schema.load(data)
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400
        
        # Prepare master data with metadata
        master_data = {
            'name': data['name'],
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],  # Will be hashed in service
            'phone_number': data['phone_number'],
            'address': data.get('address'),  # Optional
            'status': 'not_active',  # Default to not_active, will be updated by socket connection
            'created_by': current_username,
            'created_by_user_id': str(current_user_id),
            'created_by_user_type': current_user_type,
            'created_at': datetime.now(timezone.utc),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent')
        }
        
        # Create master
        master = MasterService.create_master(master_data)
        
        return jsonify({
            'message': 'Master registered successfully',
            'master': master.to_dict()
        }), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Handle duplicate key errors (MongoDB unique index)
        if 'duplicate key' in str(e).lower() or 'E11000' in str(e) or 'already exists' in str(e).lower():
            return jsonify({'error': str(e)}), 409
        return jsonify({'error': str(e)}), 500


@api_bp.route('/register_seller', methods=['POST'])
@jwt_required()
def register_seller():
    """Register a new seller"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get current user info from JWT token
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Authentication required. Please log in first.'}), 401
            
            claims = get_jwt()
            current_user_type = claims.get('user_type')
            current_username = claims.get('username') or 'system'
        except Exception as jwt_error:
            return jsonify({'error': f'Token validation failed: {str(jwt_error)}. Please log in again.'}), 401
        
        # Only masters can register sellers
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can register sellers'}), 403
        
        try:
            schema = SellerRegistrationSchema()
            data = schema.load(data)
            trade_id = data['trade_id']
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400
        
        # Prepare seller data with metadata
        seller_data = {
            'trade_id': trade_id,
            'email': data['email'],
            'password': data['password'],  # Will be hashed in service
            'phone_number': data.get('phone_number'),  # Optional but recommended
            'first_name': data.get('first_name'),  # Optional
            'last_name': data.get('last_name'),  # Optional
            'is_active': False,  # Default to False, will be updated by socket connection
            'created_by': current_username,
            'created_by_user_id': str(current_user_id),
            'created_by_user_type': current_user_type,
            'created_at': datetime.now(timezone.utc),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent')
        }
        
        # Create seller
        seller = SellerService.create_seller(seller_data)
        
        return jsonify({
            'message': 'Seller registered successfully',
            'seller': seller.to_dict()
        }), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Handle duplicate key errors (MongoDB unique index)
        if 'duplicate key' in str(e).lower() or 'E11000' in str(e) or 'already exists' in str(e).lower():
            return jsonify({'error': str(e)}), 409
        return jsonify({'error': str(e)}), 500


@api_bp.route('/sellers', methods=['GET'])
@jwt_required()
def get_sellers():
    """Get all sellers"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can view sellers
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view sellers'}), 403
        
        # Get pagination parameters
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        # Get all sellers
        sellers = SellerService.get_all_sellers(skip=skip, limit=limit)
        
        return jsonify({
            'sellers': [seller.to_dict() for seller in sellers],
            'count': len(sellers)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get sellers: {str(e)}'}), 500


@api_bp.route('/sellers/<seller_id>', methods=['PUT'])
@jwt_required()
def update_seller(seller_id):
    """Update a seller (Masters can update any, Sellers can update themselves)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Security check: Only masters OR the seller themselves can update
        if current_user_type != 'master' and str(current_user_id) != str(seller_id):
            return jsonify({'error': 'Unauthorized. Only masters or the account owner can update this profile.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get seller (include blacklisted to allow editing)
        seller = SellerService.get_seller_by_id(seller_id, include_blacklisted=True)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404
        
        # Prepare update data (only allow certain fields to be updated)
        allowed_fields = ['email', 'phone_number', 'first_name', 'last_name', 'is_active', 'image_url']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Support 'image' key from frontend as 'image_url'
        if 'image' in data and 'image_url' not in update_data:
            update_data['image_url'] = data['image']

        from app.utils.image_handler import is_base64_image, is_stored_image_url
        if 'image_url' in update_data:
            img = update_data['image_url']
            if is_base64_image(img):
                return jsonify({'error': 'Base64 images are not supported. Use POST /api/images/upload.'}), 400
            if img and not is_stored_image_url(img):
                return jsonify({'error': 'Invalid image_url'}), 400
        
        # Validate email if provided
        if 'email' in update_data and not validate_email(update_data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email already exists (if changing email)
        if 'email' in update_data and update_data['email'] != seller.email:
            existing_seller = SellerService.get_seller_by_email(update_data['email'], include_blacklisted=True)
            if existing_seller and str(existing_seller._id) != seller_id:
                return jsonify({'error': 'Email already exists'}), 409
        
        # Update seller
        updated_seller = SellerService.update_seller(seller_id, update_data)
        if not updated_seller:
            return jsonify({'error': 'Failed to update seller'}), 500
        
        return jsonify({
            'message': 'Seller updated successfully',
            'seller': updated_seller.to_dict()
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update seller: {str(e)}'}), 500


@api_bp.route('/sellers/<seller_id>/credits/initiate', methods=['POST'])
@jwt_required()
def initiate_seller_credit_otp(seller_id):
    """Master: verify passkey, send OTP to acting master phone, return credit authorization token."""
    try:
        from app.services.credit_security_service import CreditSecurityService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Unauthorized. Only masters can add seller credits.'}), 403

        data = request.get_json() or {}
        if not data.get('passkey'):
            return jsonify({'error': 'Credit passkey is required'}), 400
        amount = int(data.get('amount', 0))
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
        if amount > 100000:
            return jsonify({'error': 'Maximum credit grant per operation is 100000'}), 400

        seller = SellerService.get_seller_by_id(seller_id)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404

        master = MasterService.get_master_by_id(str(get_jwt_identity()))
        if not master:
            return jsonify({'error': 'Master account not found'}), 404

        result = CreditSecurityService.initiate_master_credit_otp(
            master, seller_id, amount, data['passkey']
        )

        payload = {
            'message': 'OTP sent to your registered phone. Enter it to confirm credits.',
            'otp_session_id': result['otp_session_id'],
            'credit_authorization': result['credit_authorization'],
            'phone_masked': result['phone_masked'],
            'sms_sent': result['sms_sent'],
        }
        if current_app.config.get('DEBUG') and result.get('sms_error'):
            payload['sms_error'] = result['sms_error']

        return jsonify(payload), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to initiate credit OTP: {str(e)}'}), 500


@api_bp.route('/sellers/<seller_id>/credits/confirm', methods=['POST'])
@jwt_required()
def confirm_seller_credits(seller_id):
    """Master: verify OTP + RS256 token, then add credits and record wallet transaction."""
    try:
        from app.services.credit_security_service import CreditSecurityService
        from app.services.wallet_transaction_service import WalletTransactionService

        current_user_id = str(get_jwt_identity())
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Unauthorized. Only masters can add seller credits.'}), 403

        data = request.get_json() or {}
        amount = int(data.get('amount', 0))
        otp_session_id = data.get('otp_session_id')
        otp = data.get('otp')
        credit_authorization = data.get('credit_authorization')

        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
        if not otp_session_id or not otp:
            return jsonify({'error': 'OTP session and OTP code are required'}), 400
        if not credit_authorization:
            return jsonify({'error': 'Credit authorization token is required'}), 400

        seller = SellerService.get_seller_by_id(seller_id)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404

        master = MasterService.get_master_by_id(current_user_id)
        master_username = (
            (master.username if master else None)
            or claims.get('username')
            or 'master'
        )

        CreditSecurityService.verify_master_credit_otp(
            current_user_id,
            seller_id,
            amount,
            otp_session_id,
            str(otp).strip(),
            credit_authorization,
        )

        balance_before = int(seller.credits or 0)
        updated_seller = SellerService.add_credits(seller_id, amount)
        if not updated_seller:
            return jsonify({'error': 'Seller not found'}), 404

        WalletTransactionService.record_transaction(
            seller_id=seller_id,
            seller_trade_id=seller.trade_id,
            transaction_type='master_grant',
            amount=amount,
            balance_before=balance_before,
            balance_after=updated_seller.credits,
            master_id=current_user_id,
            master_username=master_username,
            notes=f'Master grant by {master_username}',
            metadata={'otp_verified': True},
            request=request,
        )

        CreditSecurityService.notify_masters_credit_alert_best_effort(
            master_username=master_username,
            seller_trade_id=seller.trade_id or str(seller_id),
            amount=amount,
        )

        return jsonify({
            'message': f'Successfully added {amount} credits',
            'credits': updated_seller.credits,
            'seller': updated_seller.to_dict(),
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to add credits: {str(e)}'}), 500


@api_bp.route('/sellers/<seller_id>/wallet-transactions', methods=['GET'])
@jwt_required()
def list_seller_wallet_transactions(seller_id):
    """List wallet transactions for a seller (masters only)."""
    try:
        from app.services.wallet_transaction_service import WalletTransactionService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Unauthorized'}), 403

        seller = SellerService.get_seller_by_id(seller_id)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404

        skip = request.args.get('skip', 0, type=int)
        limit = min(request.args.get('limit', 50, type=int), 100)
        items, total = WalletTransactionService.list_for_seller(seller_id, skip=skip, limit=limit)

        return jsonify({
            'transactions': items,
            'count': len(items),
            'total': total,
            'seller': {
                'id': str(seller_id),
                'trade_id': seller.trade_id,
                'credits': seller.credits,
            },
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/sellers/<seller_id>/wallet-overview', methods=['GET'])
@jwt_required()
def get_seller_wallet_overview(seller_id):
    """Master-only: seller profile, wallet stats, and full transaction history."""
    try:
        from app.services.wallet_transaction_service import WalletTransactionService
        from app.services.rating_service import RatingService
        from bson import ObjectId

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Unauthorized. Master access only.'}), 403

        seller = SellerService.get_seller_by_id(seller_id, include_blacklisted=True)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404

        skip = request.args.get('skip', 0, type=int)
        limit = min(request.args.get('limit', 100, type=int), 200)
        transactions, tx_total = WalletTransactionService.list_for_seller(
            seller_id, skip=skip, limit=limit
        )
        wallet_stats = WalletTransactionService.get_stats_for_seller(seller_id)

        sid_oid = ObjectId(seller_id)
        product_count = mongo.db.products.count_documents({'seller_trade_id': seller.trade_id})
        service_count = mongo.db.services.count_documents({'seller_trade_id': seller.trade_id})
        order_count = mongo.db.orders.count_documents({'seller_id': sid_oid})

        try:
            rating_stats = RatingService.get_seller_rating_stats(seller_id)
        except Exception:
            rating_stats = {'total_ratings': 0, 'average_rating': 0}

        full_name = ' '.join(
            p for p in [seller.first_name, seller.last_name] if p
        ).strip() or None

        return jsonify({
            'seller': seller.to_dict(),
            'profile': {
                'full_name': full_name,
                'trade_id': seller.trade_id,
                'email': seller.email,
                'phone_number': seller.phone_number,
                'is_active': seller.is_active,
                'created_at': seller.created_at.isoformat()
                if hasattr(seller.created_at, 'isoformat')
                else seller.created_at,
                'created_by': seller.created_by,
                'image_url': seller.image_url,
            },
            'wallet_stats': wallet_stats,
            'marketplace_stats': {
                'product_count': product_count,
                'service_count': service_count,
                'order_count': order_count,
                'average_rating': rating_stats.get('average_rating', 0),
                'total_ratings': rating_stats.get('total_ratings', 0),
            },
            'transactions': transactions,
            'transactions_total': tx_total,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/sellers/<seller_id>/blacklist', methods=['POST'])
@jwt_required()
def blacklist_seller(seller_id):
    """Blacklist a seller (only masters can blacklist)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can blacklist sellers
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can blacklist sellers'}), 403
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Blacklisted by master')
        
        # Get seller (include blacklisted to check if already blacklisted)
        seller = SellerService.get_seller_by_id(seller_id, include_blacklisted=True)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404
        
        # Check if already blacklisted
        if BlacklistService.is_blacklisted(seller_id):
            return jsonify({'error': 'Seller is already blacklisted'}), 409
        
        # Blacklist the seller
        blacklist_entry = BlacklistService.blacklist_seller(
            seller_id=seller_id,
            blacklisted_by=current_user_id,
            reason=reason
        )
        
        return jsonify({
            'message': 'Seller blacklisted successfully',
            'blacklist': blacklist_entry.to_dict()
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to blacklist seller: {str(e)}'}), 500


@api_bp.route('/sellers/<seller_id>/blacklist', methods=['DELETE'])
@jwt_required()
def unblacklist_seller(seller_id):
    """Remove seller from blacklist (masters only)"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can modify blacklist'}), 403

        if not BlacklistService.is_blacklisted(seller_id):
            return jsonify({'error': 'Seller is not blacklisted'}), 404

        success = BlacklistService.unblacklist_seller(seller_id)
        if not success:
            return jsonify({'error': 'Failed to remove seller from blacklist'}), 500

        return jsonify({
            'message': 'Seller removed from blacklist successfully',
            'seller_id': seller_id
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to unblacklist seller: {str(e)}'}), 500


@api_bp.route('/sellers/blacklisted', methods=['GET'])
@jwt_required()
def get_blacklisted_sellers():
    """List blacklisted sellers"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view blacklisted sellers'}), 403

        entries = BlacklistService.get_all_blacklisted_entries('seller')
        result = []
        for entry in entries:
            # Support both new format (user_id) and legacy format (seller_id)
            user_id = str(entry.user_id) if hasattr(entry, 'user_id') else str(entry.seller_id)
            seller = SellerService.get_seller_by_id(user_id, include_blacklisted=True)
            if seller:
                seller_dict = seller.to_dict()
                seller_dict['blacklist'] = entry.to_dict()
                result.append(seller_dict)

        return jsonify({
            'blacklisted_sellers': result,
            'count': len(result)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get blacklisted sellers: {str(e)}'}), 500


@api_bp.route('/register_outlet_man', methods=['POST'])
@jwt_required()
def register_outlet_man():
    """Register a new outlet man"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get current user info from JWT token
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Authentication required. Please log in first.'}), 401
            
            claims = get_jwt()
            current_user_type = claims.get('user_type')
            current_username = claims.get('username') or 'system'
        except Exception as jwt_error:
            return jsonify({'error': f'Token validation failed: {str(jwt_error)}. Please log in again.'}), 401
        
        # Only masters can register outlet men
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can register outlet men'}), 403
        
        # Validate required fields
        required_fields = ['outlet_access_code', 'email', 'password']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate outlet_access_code format (alphanumeric, allow hyphens and underscores)
        outlet_access_code = data.get('outlet_access_code', '').strip()
        if not outlet_access_code:
            return jsonify({'error': 'Outlet Access Code is required'}), 400
        if not all(c.isalnum() or c in ['-', '_'] for c in outlet_access_code):
            return jsonify({'error': 'Outlet Access Code must contain only alphanumeric characters, hyphens, and underscores'}), 400
        
        # Prepare outlet man data with metadata
        outlet_man_data = {
            'outlet_access_code': outlet_access_code,
            'email': data['email'],
            'password': data['password'],  # Will be hashed in service
            'phone_number': data.get('phone_number'),  # Optional but recommended
            'first_name': data.get('first_name'),  # Optional
            'last_name': data.get('last_name'),  # Optional
            'is_active': False,  # Default to False
            'created_by': current_username,
            'created_at': datetime.now(timezone.utc)
        }
        
        # Create outlet man
        outlet_man = OutletManService.create_outlet_man(outlet_man_data)
        
        return jsonify({
            'message': 'Outlet man registered successfully',
            'outlet_man': outlet_man.to_dict()
        }), 201
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Handle duplicate key errors (MongoDB unique index)
        if 'duplicate key' in str(e).lower() or 'E11000' in str(e) or 'already exists' in str(e).lower():
            return jsonify({'error': str(e)}), 409
        return jsonify({'error': str(e)}), 500




@api_bp.route('/outlet_men', methods=['GET'])
@jwt_required()
def get_outlet_men():
    """Get all outlet men"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can view outlet men
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view outlet men'}), 403
        
        # Get pagination parameters
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        # Get all outlet men
        outlet_men = OutletManService.get_all_outlet_men(skip=skip, limit=limit)
        
        return jsonify({
            'outlet_men': [outlet_man.to_dict() for outlet_man in outlet_men],
            'count': len(outlet_men)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get outlet men: {str(e)}'}), 500


@api_bp.route('/outlet_men/<outlet_man_id>', methods=['PUT'])
@jwt_required()
def update_outlet_man(outlet_man_id):
    """Update an outlet man (Masters can update any, OutletMen can update themselves)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Security check: Only masters OR the outlet man themselves can update
        if current_user_type != 'master' and str(current_user_id) != str(outlet_man_id):
            return jsonify({'error': 'Unauthorized. Only masters or the account owner can update this profile.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get outlet man (include blacklisted to allow editing)
        outlet_man = OutletManService.get_outlet_man_by_id(outlet_man_id, include_blacklisted=True)
        if not outlet_man:
            return jsonify({'error': 'Outlet man not found'}), 404
        
        # Prepare update data (only allow certain fields to be updated)
        allowed_fields = ['email', 'phone_number', 'first_name', 'last_name', 'is_active', 'image_url']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Support 'image' key from frontend as 'image_url'
        if 'image' in data and 'image_url' not in update_data:
            update_data['image_url'] = data['image']
        
        # Validate email if provided
        if 'email' in update_data and not validate_email(update_data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email already exists (if changing email)
        if 'email' in update_data and update_data['email'] != outlet_man.email:
            existing_outlet_man = OutletManService.get_outlet_man_by_email(update_data['email'], include_blacklisted=True)
            if existing_outlet_man and str(existing_outlet_man._id) != outlet_man_id:
                return jsonify({'error': 'Email already exists'}), 409
        
        # Update outlet man
        updated_outlet_man = OutletManService.update_outlet_man(outlet_man_id, update_data)
        if not updated_outlet_man:
            return jsonify({'error': 'Failed to update outlet man'}), 500
        
        return jsonify({
            'message': 'Outlet man updated successfully',
            'outlet_man': updated_outlet_man.to_dict()
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update outlet man: {str(e)}'}), 500


@api_bp.route('/outlet_men/<outlet_man_id>/blacklist', methods=['POST'])
@jwt_required()
def blacklist_outlet_man(outlet_man_id):
    """Blacklist an outlet man (only masters can blacklist)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can blacklist outlet men
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can blacklist outlet men'}), 403
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Blacklisted by master')
        
        # Get outlet man (include blacklisted to check if already blacklisted)
        outlet_man = OutletManService.get_outlet_man_by_id(outlet_man_id, include_blacklisted=True)
        if not outlet_man:
            return jsonify({'error': 'Outlet man not found'}), 404
        
        # Check if already blacklisted
        if BlacklistService.is_blacklisted(outlet_man_id, 'outlet_man'):
            return jsonify({'error': 'Outlet man is already blacklisted'}), 409
        
        # Blacklist the outlet man
        blacklist_entry = BlacklistService.blacklist_user(
            user_id=outlet_man_id,
            user_type='outlet_man',
            blacklisted_by=current_user_id,
            reason=reason
        )
        
        return jsonify({
            'message': 'Outlet man blacklisted successfully',
            'blacklist': blacklist_entry.to_dict()
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to blacklist outlet man: {str(e)}'}), 500


@api_bp.route('/outlet_men/<outlet_man_id>/blacklist', methods=['DELETE'])
@jwt_required()
def unblacklist_outlet_man(outlet_man_id):
    """Remove outlet man from blacklist (masters only)"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can modify blacklist'}), 403

        if not BlacklistService.is_blacklisted(outlet_man_id, 'outlet_man'):
            return jsonify({'error': 'Outlet man is not blacklisted'}), 404

        success = BlacklistService.unblacklist_user(outlet_man_id, 'outlet_man')
        if not success:
            return jsonify({'error': 'Failed to remove outlet man from blacklist'}), 500

        return jsonify({
            'message': 'Outlet man removed from blacklist successfully',
            'outlet_man_id': outlet_man_id
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to unblacklist outlet man: {str(e)}'}), 500


@api_bp.route('/outlet_men/blacklisted', methods=['GET'])
@jwt_required()
def get_blacklisted_outlet_men():
    """List blacklisted outlet men"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view blacklisted outlet men'}), 403

        entries = BlacklistService.get_all_blacklisted_entries('outlet_man')
        result = []
        for entry in entries:
            outlet_man = OutletManService.get_outlet_man_by_id(str(entry.user_id), include_blacklisted=True)
            if outlet_man:
                outlet_man_dict = outlet_man.to_dict()
                outlet_man_dict['blacklist'] = entry.to_dict()
                result.append(outlet_man_dict)

        return jsonify({
            'blacklisted_outlet_men': result,
            'count': len(result)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get blacklisted outlet men: {str(e)}'}), 500


@api_bp.route('/masters', methods=['GET'])
@jwt_required()
def get_masters():
    """Get all masters"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can view masters
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view masters'}), 403
        
        # Get pagination parameters
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        # Get all masters
        masters = MasterService.get_all_masters(skip=skip, limit=limit)
        
        return jsonify({
            'masters': [master.to_dict() for master in masters],
            'count': len(masters)
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to get masters: {str(e)}'}), 500


@api_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    """Create a new product (masters only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can create products'}), 403

        try:
            schema = ProductCreationSchema()
            data = schema.load(data)
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            if isinstance(first_err_msg, dict):
                first_err_msg = "Invalid format"
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400

        seller = _resolve_seller_for_master_product(data)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404
        if not seller.trade_id:
            return jsonify({'error': 'Seller account is missing a trade ID'}), 400

        seller_fields = _seller_profile_fields(seller)
        product_data = {
            'product_name': data['product_name'],
            'specification': data['specification'],
            'points': data['points'],
            'thumbnail': data['thumbnail'],
            'gallery': data.get('gallery', []),
            'categories': data.get('categories', []),
            'selling_price': data['selling_price'],
            'max_price': data['max_price'],
            **seller_fields,
            'created_by': current_username,
            'approval_status': 'approved',
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent'),
            'delivery_span': data.get('delivery_span'),
        }
        if data.get('commission_rate') is not None:
            product_data['commission_rate'] = data['commission_rate']
        if data.get('product_id'):
            product_data['product_id'] = data['product_id']

        product = ProductService.create_product(product_data)
        product_dict = product.to_dict()
        emit_product_event('product_created', product_dict)

        return jsonify({
            'message': 'Product created successfully',
            'product': product_dict
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create product: {str(e)}'}), 500


@api_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products (public endpoint)"""
    try:
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        can_view_seller_private = _is_master_request()

        products = ProductService.get_all_products(skip=skip, limit=limit)
        product_payload = []
        for product in products:
            product_dict = product.to_dict()
            if not can_view_seller_private:
                _sanitize_product_seller_fields(product_dict)
            product_payload.append(product_dict)

        return jsonify({
            'products': product_payload,
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get products: {str(e)}'}), 500


@api_bp.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get single product details"""
    try:
        product = ProductService.get_product_by_id(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
            
        product_dict = product.to_dict()
        can_view_seller_private = _is_master_request()
        if not can_view_seller_private:
            _sanitize_product_seller_fields(product_dict)
        
        # Add seller_id if available for ratings
        if product.seller_trade_id:
            seller = SellerService.get_seller_by_trade_id(product.seller_trade_id)
            if seller:
                product_dict['seller_id'] = str(seller._id)
                
        return jsonify({'product': product_dict}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@api_bp.route('/seller/my-products', methods=['GET'])
@jwt_required()
def get_seller_my_products():
    """Get products belonging to the current seller"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can access this endpoint'}), 403

        user_id = get_jwt_identity()
        trade_id = claims.get('trade_id')
        
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        products = ProductService.get_products_by_seller(
            user_id=user_id, 
            trade_id=trade_id, 
            skip=skip, 
            limit=limit,
            include_pending=True # Sellers should see their own pending products
        )

        return jsonify({
            'products': [product.to_dict() for product in products],
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get seller products: {str(e)}'}), 500



@api_bp.route('/products/<product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Update product (masters only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can update products'}), 403

        data['updated_by'] = current_username
        data['updated_by_user_id'] = str(current_user_id)
        data['updated_by_user_type'] = current_user_type

        if any(data.get(key) for key in ('seller_trade_id', 'seller_id', 'created_by_user_id')):
            seller = _resolve_seller_for_master_product(data)
            if not seller:
                return jsonify({'error': 'Seller not found'}), 404
            if not seller.trade_id:
                return jsonify({'error': 'Seller account is missing a trade ID'}), 400
            data.update(_seller_profile_fields(seller))

        product = ProductService.update_product(product_id, data)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        product_dict = product.to_dict()
        emit_product_event('product_updated', product_dict)

        return jsonify({
            'message': 'Product updated successfully',
            'product': product_dict
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update product: {str(e)}'}), 500


@api_bp.route('/seller/products', methods=['POST'])
@jwt_required()
def seller_create_product():
    """Seller-facing endpoint to create a product."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        try:
            schema = ProductCreationSchema()
            data = schema.load(data)
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            if isinstance(first_err_msg, dict):
                first_err_msg = "Invalid format"
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400

        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can access this endpoint'}), 403

        seller_trade_id = claims.get('trade_id')
        seller_user_id = str(get_jwt_identity())

        data['seller_trade_id'] = seller_trade_id
        data['created_by'] = seller_trade_id
        data['created_by_user_id'] = seller_user_id
        data['created_by_user_type'] = 'seller'
        data['approval_status'] = 'pending'  # Seller products need approval

        product = ProductService.create_product(data)
        product_dict = product.to_dict()
        emit_product_event('product_created', product_dict)

        return jsonify({
            'message': 'Product submitted for approval. It will be visible after master confirmation.',
            'product': product_dict
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create product: {str(e)}'}), 500


@api_bp.route('/seller/products/<product_id>', methods=['PUT'])
@jwt_required()
def seller_update_product(product_id):
    """Seller-facing endpoint to update owned product."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can access this endpoint'}), 403

        seller_trade_id = claims.get('trade_id')
        seller_user_id = str(get_jwt_identity())

        # Check if product exists and belongs to seller
        existing_product = ProductService.get_product_by_id(product_id)
        if not existing_product:
            return jsonify({'error': 'Product not found'}), 404
        
        if existing_product.seller_trade_id != seller_trade_id:
            return jsonify({'error': 'You can only edit your own products'}), 403

        # For seller edits, create a pending edit request instead of updating directly
        data['seller_trade_id'] = seller_trade_id
        data['created_by'] = seller_trade_id
        data['created_by_user_id'] = seller_user_id
        data['created_by_user_type'] = 'seller'
        data['approval_status'] = 'pending'
        data['pending_changes'] = data.copy()  # Store the changes
        data['original_product_id'] = product_id  # Reference to original product
        data['product_name'] = data.get('product_name', existing_product.product_name)
        data['specification'] = data.get('specification', existing_product.specification)
        data['points'] = data.get('points', existing_product.points)
        data['thumbnail'] = data.get('thumbnail', existing_product.thumbnail)
        data['gallery'] = data.get('gallery', existing_product.gallery)
        data['selling_price'] = data.get('selling_price', existing_product.selling_price)
        data['max_price'] = data.get('max_price', existing_product.max_price)
        data['quantity'] = data.get('quantity', existing_product.quantity)
        data['categories'] = data.get('categories', existing_product.categories)
        data['delivery_span'] = data.get('delivery_span', getattr(existing_product, 'delivery_span', 2))

        # Create pending edit request
        edit_request = ProductService.create_product(data)
        edit_request_dict = edit_request.to_dict()
        emit_product_event('product_updated', edit_request_dict)

        return jsonify({
            'message': 'Product edit submitted for approval. Changes will be applied after master confirmation.',
            'product': edit_request_dict
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update product: {str(e)}'}), 500


@api_bp.route('/products/pending', methods=['GET'])
@jwt_required()
def get_pending_products():
    """Get all pending products (masters only)"""
    try:
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view pending products'}), 403

        pending_products = ProductService.get_pending_products()
        products_list = [product.to_dict() for product in pending_products]

        return jsonify({
            'products': products_list,
            'count': len(products_list)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get pending products: {str(e)}'}), 500


@api_bp.route('/products/<product_id>/approve', methods=['POST'])
@jwt_required()
def approve_product(product_id):
    """Approve a pending product (masters only)"""
    try:
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can approve products'}), 403

        product, error = ProductService.accept_product(product_id)
        if error:
            return jsonify({'error': error}), 400
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        product_dict = product.to_dict()
        emit_product_event('product_approved', product_dict)

        return jsonify({
            'message': 'Product approved successfully',
            'product': product_dict
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to approve product: {str(e)}'}), 500


@api_bp.route('/products/<product_id>/reject', methods=['POST'])
@jwt_required()
def reject_product(product_id):
    """Reject a pending product (masters only)"""
    try:
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can reject products'}), 403

        data = request.get_json() or {}
        move_to_bin = data.get('move_to_bin', True)
        reason = data.get('reason', '').strip()
        recommendation = data.get('recommendation', '').strip()

        if not reason:
            return jsonify({'error': 'Rejection reason is required'}), 400

        success, error = ProductService.reject_product(product_id, move_to_bin, reason, recommendation)
        if error:
            return jsonify({'error': error}), 400
        if not success:
            return jsonify({'error': 'Failed to reject product'}), 400

        return jsonify({
            'message': 'Product rejected successfully',
            'reason': reason,
            'recommendation': recommendation if recommendation else None
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to reject product: {str(e)}'}), 500


@api_bp.route('/products/<product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Delete product (masters only)"""
    try:
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can delete products'}), 403

        success = ProductService.delete_product(product_id)
        if not success:
            return jsonify({'error': 'Product not found'}), 404

        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to delete product: {str(e)}'}), 500


@api_bp.route('/categories', methods=['GET'])
def get_categories():
    """Public endpoint — product categories by default; ?type=service for service categories"""
    try:
        category_type = request.args.get('type', 'product')
        categories = CategoryService.get_all_categories(category_type=category_type)
        return jsonify({
            'categories': [category.to_dict() for category in categories],
            'count': len(categories),
            'type': category_type,
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to get categories: {str(e)}'}), 500


@api_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Create new category (masters only). Body: { name, type?: 'product'|'service' }"""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400

        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can create categories'}), 403

        category_type = data.get('type') or data.get('category_type') or 'product'
        category = CategoryService.create_category(
            data['name'],
            created_by=current_username,
            category_type=category_type,
        )
        return jsonify({
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create category: {str(e)}'}), 500


@api_bp.route('/commission/apply-all', methods=['POST'])
@jwt_required()
def apply_commission_to_all():
    """Apply commission to all products (masters only)"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        commission_rate = data.get('commission_rate')
        
        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_count = ProductService.apply_commission_to_all(float(commission_rate))
        
        return jsonify({
            'message': f'Commission applied to {updated_count} products',
            'updated_count': updated_count
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply commission: {str(e)}'}), 500


@api_bp.route('/commission/apply-category', methods=['POST'])
@jwt_required()
def apply_commission_by_category():
    """Apply commission to products by category (masters only)"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        category = data.get('category')
        commission_rate = data.get('commission_rate')
        
        if not category:
            return jsonify({'error': 'Category is required'}), 400
        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_count = ProductService.apply_commission_by_category(category, float(commission_rate))
        
        return jsonify({
            'message': f'Commission applied to {updated_count} products in category "{category}"',
            'updated_count': updated_count
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply commission: {str(e)}'}), 500


@api_bp.route('/commission/apply-product', methods=['POST'])
@jwt_required()
def apply_commission_to_product():
    """Apply commission to a specific product (masters only)"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        product_id = data.get('product_id')
        commission_rate = data.get('commission_rate')
        
        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400
        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_product = ProductService.apply_commission_to_product(product_id, float(commission_rate))
        
        if not updated_product:
            return jsonify({'error': 'Product not found'}), 404

        product_dict = updated_product.to_dict()
        emit_product_event('product_updated', product_dict)
        
        return jsonify({
            'message': 'Commission applied successfully',
            'product': product_dict
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply commission: {str(e)}'}), 500


@api_bp.route('/commission/category-rates', methods=['GET'])
@jwt_required()
def get_category_commission_rates():
    """Get all category commission rates (masters only)"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can view commission rates'}), 403

        rates = ProductService.get_all_category_commissions()
        return jsonify({
            'category_commissions': rates
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get category commissions: {str(e)}'}), 500


@api_bp.route('/commission/service/apply-all', methods=['POST'])
@jwt_required()
def apply_service_commission_to_all():
    """Apply commission to all services (masters only)"""
    try:
        from app.services.service_service import ServiceService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        commission_rate = data.get('commission_rate')

        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_count = ServiceService.apply_commission_to_all(float(commission_rate))

        return jsonify({
            'message': f'Commission applied to {updated_count} services',
            'updated_count': updated_count,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply service commission: {str(e)}'}), 500


@api_bp.route('/commission/service/apply-category', methods=['POST'])
@jwt_required()
def apply_service_commission_by_category():
    """Apply commission to services by category (masters only)"""
    try:
        from app.services.service_service import ServiceService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        category = data.get('category')
        commission_rate = data.get('commission_rate')

        if not category:
            return jsonify({'error': 'Category is required'}), 400
        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_count = ServiceService.apply_commission_by_category(category, float(commission_rate))

        return jsonify({
            'message': f'Commission applied to {updated_count} services in category {category}',
            'updated_count': updated_count,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply service commission: {str(e)}'}), 500


@api_bp.route('/commission/service/apply-service', methods=['POST'])
@jwt_required()
def apply_commission_to_service():
    """Apply commission to a specific service (masters only)"""
    try:
        from app.services.service_service import ServiceService
        from app.sockets.emitter import emit_service_event

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can apply commission'}), 403

        data = request.get_json()
        service_id = data.get('service_id')
        commission_rate = data.get('commission_rate')

        if not service_id:
            return jsonify({'error': 'service_id is required'}), 400
        if commission_rate is None or commission_rate < 0:
            return jsonify({'error': 'Valid commission_rate (percentage) is required'}), 400

        updated_service = ServiceService.apply_commission_to_service(service_id, float(commission_rate))

        if not updated_service:
            return jsonify({'error': 'Service not found'}), 404

        service_dict = updated_service.to_dict()
        emit_service_event('service_updated', service_dict)

        return jsonify({
            'message': 'Commission applied successfully',
            'service': service_dict,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to apply service commission: {str(e)}'}), 500


@api_bp.route('/commission/service/category-rates', methods=['GET'])
@jwt_required()
def get_service_category_commission_rates():
    """Get all service category commission rates (masters only)"""
    try:
        from app.services.service_service import ServiceService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can view commission rates'}), 403

        rates = ServiceService.get_all_category_commissions()
        return jsonify({'category_commissions': rates}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get service category commissions: {str(e)}'}), 500


@api_bp.route('/commission/service-accept-credit', methods=['GET'])
@jwt_required()
def get_service_accept_credit():
    """Get credits deducted when a seller accepts a service order"""
    try:
        from app.services.platform_settings_service import PlatformSettingsService

        category = (request.args.get('category') or '').strip() or None
        credit_count = PlatformSettingsService.get_service_accept_credit_cost(category)
        return jsonify({'credit_count': credit_count, 'category': category}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get service accept credit: {str(e)}'}), 500


@api_bp.route('/commission/service-category-accept-credits', methods=['GET'])
@jwt_required()
def get_service_category_accept_credits():
    """Get per-category service accept credit costs (masters only)"""
    try:
        from app.services.platform_settings_service import PlatformSettingsService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can view service category credits'}), 403

        category_credits = PlatformSettingsService.get_all_service_category_accept_credits()
        default_credit = PlatformSettingsService.get_service_accept_credit_cost()
        return jsonify({
            'category_credits': category_credits,
            'default_credit': default_credit,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get service category credits: {str(e)}'}), 500


@api_bp.route('/commission/service-category-accept-credits', methods=['PUT'])
@jwt_required()
def set_service_category_accept_credits():
    """Set per-category service accept credit costs (masters only)"""
    try:
        from app.services.platform_settings_service import PlatformSettingsService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can update service category credits'}), 403

        data = request.get_json() or {}
        category_credits = data.get('category_credits')
        if not isinstance(category_credits, dict) or not category_credits:
            return jsonify({'error': 'category_credits object is required'}), 400

        for category, count in category_credits.items():
            if int(count) < 0:
                return jsonify({'error': f'Invalid credit count for category {category}'}), 400

        saved = PlatformSettingsService.bulk_set_service_category_accept_credits(category_credits)
        return jsonify({
            'message': f'Saved accept credits for {len(saved)} service categories',
            'category_credits': saved,
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update service category credits: {str(e)}'}), 500


@api_bp.route('/commission/service-accept-credit', methods=['PUT'])
@jwt_required()
def set_service_accept_credit():
    """Set credits deducted when a seller accepts a service order (masters only)"""
    try:
        from app.services.platform_settings_service import PlatformSettingsService

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can update service accept credit'}), 403

        data = request.get_json() or {}
        credit_count = data.get('credit_count')

        if credit_count is None or int(credit_count) < 0:
            return jsonify({'error': 'Valid credit_count (0 or greater) is required'}), 400

        saved = PlatformSettingsService.set_service_accept_credit_cost(int(credit_count))

        return jsonify({
            'message': f'Service accept credit set to {saved}',
            'credit_count': saved,
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update service accept credit: {str(e)}'}), 500


@api_bp.route('/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
    """Get wishlist items for the current user with populated product data"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_type = claims.get('user_type')

        if user_type != 'user':
            return jsonify({'error': 'Only user accounts can have a wishlist'}), 403

        limit = request.args.get('limit', 50, type=int)
        skip = request.args.get('skip', 0, type=int)

        items = WishlistService.list_wishlist(str(current_user_id), limit=limit, skip=skip)
        
        # Populate product data from product_id
        from app.services.product_service import ProductService
        items_with_products = []
        for item in items:
            item_dict = item.to_dict()
            # Fetch current product data
            product = ProductService.get_product_by_id(str(item.product_id))
            if product:
                product_dict = product.to_dict()
                item_dict['product'] = {
                    'id': product_dict.get('id'),
                    'product_name': product_dict.get('product_name'),
                    'thumbnail': product_dict.get('thumbnail'),
                    'selling_price': product_dict.get('selling_price'),
                    'max_price': product_dict.get('max_price'),
                    'categories': product_dict.get('categories'),
                    'rating': product_dict.get('rating'),
                    'reviews': product_dict.get('reviews'),
                    'quantity': product_dict.get('quantity'),
                }
            items_with_products.append(item_dict)
        
        return jsonify({
            'items': items_with_products,
            'count': len(items_with_products)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch wishlist: {str(e)}'}), 500


@api_bp.route('/wishlist', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    """Add a product to current user's wishlist"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_type = claims.get('user_type')

        if user_type != 'user':
            return jsonify({'error': 'Only user accounts can have a wishlist'}), 403

        data = request.get_json() or {}
        product_id = data.get('product_id')
        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400

        metadata = {
            'added_at_ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
        }

        item = WishlistService.add_to_wishlist(str(current_user_id), product_id, metadata=metadata)
        return jsonify({'item': item.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to add to wishlist: {str(e)}'}), 500


@api_bp.route('/wishlist/<product_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(product_id):
    """Remove a product from current user's wishlist"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_type = claims.get('user_type')

        if user_type != 'user':
            return jsonify({'error': 'Only user accounts can have a wishlist'}), 403

        success = WishlistService.remove_from_wishlist(str(current_user_id), product_id)
        if not success:
            return jsonify({'error': 'Wishlist item not found'}), 404

        return jsonify({'message': 'Removed from wishlist'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to remove from wishlist: {str(e)}'}), 500


@api_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """Upload a file and return its URL"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file:
            # Ensure upload folder exists
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            
            # Generate unique filename
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(upload_folder, unique_filename)
            
            # Save file
            file.save(file_path)
            
            # Generate URL
            # Note: In production, this should be a full URL (e.g., S3 or absolute app URL)
            # For local dev, we return a relative path or use a static serving route
            file_url = f"/api/uploads/{unique_filename}"
            
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': unique_filename,
                'url': file_url
            }), 201
            
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@api_bp.route('/uploads/<filename>', methods=['GET'])
def uploaded_file(filename):
    """Serve uploaded files"""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    return send_from_directory(upload_folder, filename)
