"""
Simple API route - Welcome endpoint
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.master_service import MasterService
from app.services.seller_service import SellerService
from app.services.outlet_man_service import OutletManService
from app.services.blacklist_service import BlacklistService
from app.services.category_service import CategoryService
from app.services.product_service import ProductService
from app.services.wishlist_service import WishlistService
from app.sockets.emitter import emit_product_event
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
            'created_at': datetime.utcnow()
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
    """Update an outlet man (only masters can update)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        
        # Only masters can update outlet men
        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can update outlet men'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Get outlet man (include blacklisted to allow editing)
        outlet_man = OutletManService.get_outlet_man_by_id(outlet_man_id, include_blacklisted=True)
        if not outlet_man:
            return jsonify({'error': 'Outlet man not found'}), 404
        
        # Prepare update data (only allow certain fields to be updated)
        allowed_fields = ['email', 'phone_number', 'first_name', 'last_name', 'is_active']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
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

        required_fields = ['product_name', 'specification', 'points', 'thumbnail', 'selling_price', 'max_price', 'quantity', 'seller_trade_id']
        for field in required_fields:
            if field not in data or data.get(field) in (None, '', []):
                return jsonify({'error': f'{field} is required'}), 400

        points = data.get('points', [])
        if not isinstance(points, list) or not points:
            return jsonify({'error': 'Points must be a non-empty list'}), 400

        normalized_points = [str(point).strip() for point in points if str(point).strip()]
        if not normalized_points:
            return jsonify({'error': 'Provide at least one bullet point'}), 400

        try:
            quantity = int(data.get('quantity', 0))
            if quantity <= 0:
                return jsonify({'error': 'quantity must be greater than zero'}), 400
        except (TypeError, ValueError):
            return jsonify({'error': 'quantity must be a positive integer'}), 400

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
            'selling_price': data.get('selling_price'),
            'max_price': data.get('max_price'),
            'quantity': quantity,
            'seller_trade_id': data.get('seller_trade_id'),
            'seller_name': data.get('seller_name'),
            'seller_email': data.get('seller_email'),
            'seller_phone': data.get('seller_phone'),
            'created_by': data.get('created_by') or current_username,
            'created_by_user_id': data.get('created_by_user_id') or str(current_user_id),
            'created_by_user_type': data.get('created_by_user_type') or current_user_type,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent')
        }

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

        products = ProductService.get_all_products(skip=skip, limit=limit)

        return jsonify({
            'products': [product.to_dict() for product in products],
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get products: {str(e)}'}), 500


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

        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can access this endpoint'}), 403

        seller_trade_id = claims.get('trade_id')
        seller_user_id = str(get_jwt_identity())

        data['seller_trade_id'] = seller_trade_id
        data['created_by'] = seller_trade_id
        data['created_by_user_id'] = seller_user_id
        data['created_by_user_type'] = 'seller'

        product = ProductService.create_product(data)
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

        data['seller_trade_id'] = seller_trade_id
        data['updated_by'] = seller_trade_id
        data['updated_by_user_id'] = seller_user_id
        data['updated_by_user_type'] = 'seller'

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
    """Public endpoint to get all product categories"""
    try:
        categories = CategoryService.get_all_categories()
        return jsonify({
            'categories': [category.to_dict() for category in categories],
            'count': len(categories)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get categories: {str(e)}'}), 500


@api_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Create new category (masters only)"""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400

        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can create categories'}), 403

        category = CategoryService.create_category(data['name'], created_by=current_username)
        return jsonify({
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create category: {str(e)}'}), 500


@api_bp.route('/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
    """Get wishlist items for the current user"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_type = claims.get('user_type')

        if user_type != 'user':
            return jsonify({'error': 'Only user accounts can have a wishlist'}), 403

        limit = request.args.get('limit', 50, type=int)
        skip = request.args.get('skip', 0, type=int)

        items = WishlistService.list_wishlist(str(current_user_id), limit=limit, skip=skip)
        return jsonify({
            'items': [item.to_dict() for item in items],
            'count': len(items)
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