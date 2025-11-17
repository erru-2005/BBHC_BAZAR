"""
Simple API route - Welcome endpoint
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.master_service import MasterService
from app.services.seller_service import SellerService
from app.services.blacklist_service import BlacklistService
from app.services.product_service import ProductService
from app.utils.validators import validate_email
from datetime import datetime

api_bp = Blueprint('api', __name__)


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
        
        # Validate required fields
        required_fields = ['name', 'username', 'email', 'password', 'phone_number']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
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
            'created_at': datetime.utcnow(),
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
        
        # Validate required fields
        required_fields = ['trade_id', 'email', 'password']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate trade_id format (alphanumeric, allow hyphens and underscores)
        trade_id = data.get('trade_id', '').strip()
        if not trade_id:
            return jsonify({'error': 'Trade ID is required'}), 400
        if not all(c.isalnum() or c in ['-', '_'] for c in trade_id):
            return jsonify({'error': 'Trade ID must contain only alphanumeric characters, hyphens, and underscores'}), 400
        
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
            'created_at': datetime.utcnow(),
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
    """Update a seller (only masters can update)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can update sellers
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can update sellers'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get seller (include blacklisted to allow editing)
        seller = SellerService.get_seller_by_id(seller_id, include_blacklisted=True)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404
        
        # Prepare update data (only allow certain fields to be updated)
        allowed_fields = ['email', 'phone_number', 'first_name', 'last_name', 'is_active']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
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

        entries = BlacklistService.get_all_blacklisted_entries()
        result = []
        for entry in entries:
            seller = SellerService.get_seller_by_id(str(entry.seller_id), include_blacklisted=True)
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

        required_fields = ['product_name', 'specification', 'points', 'thumbnail']
        for field in required_fields:
            if field not in data or data.get(field) in (None, '', []):
                return jsonify({'error': f'{field} is required'}), 400

        points = data.get('points', [])
        if not isinstance(points, list) or not points:
            return jsonify({'error': 'Points must be a non-empty list'}), 400

        normalized_points = [str(point).strip() for point in points if str(point).strip()]
        if not normalized_points:
            return jsonify({'error': 'Provide at least one bullet point'}), 400

        categories = data.get('categories', [])
        if categories and not isinstance(categories, list):
            return jsonify({'error': 'categories must be a list'}), 400

        product_data = {
            'product_name': data['product_name'],
            'specification': data['specification'],
            'points': normalized_points,
            'thumbnail': data['thumbnail'],
            'gallery': data.get('gallery', []),
            'categories': categories,
            'created_by': current_username,
            'created_by_user_id': str(current_user_id),
            'created_by_user_type': current_user_type,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent')
        }

        product = ProductService.create_product(product_data)

        return jsonify({
            'message': 'Product created successfully',
            'product': product.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create product: {str(e)}'}), 500


@api_bp.route('/products', methods=['GET'])
@jwt_required()
def get_products():
    """Get all products (masters only)"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can view products'}), 403

        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)

        products = ProductService.get_all_products(skip=skip, limit=limit)

        return jsonify({
            'products': [product.to_dict() for product in products],
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get products: {str(e)}'}), 500