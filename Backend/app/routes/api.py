"""
Simple API route - Welcome endpoint
"""
from flask import Blueprint, jsonify, request
from app.services.master_service import MasterService
from app.services.user_service import UserService
from app.utils.validators import validate_email

api_bp = Blueprint('api', __name__)


@api_bp.route('/', methods=['GET'])
def welcome():
    """Welcome endpoint"""
    return jsonify({
        'message': 'Welcome to BBHC Bazar API'
    }), 200


@api_bp.route('/register_master', methods=['POST'])
def register_master():
    """Register a new master"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'username', 'email', 'password', 'phone_number']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate status if provided
        if 'status' in data and data['status'] not in ['active', 'not_active']:
            return jsonify({'error': "Status must be 'active' or 'not_active'"}), 400
        
        # Prepare master data
        master_data = {
            'name': data['name'],
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],  # Will be hashed in service
            'phone_number': data['phone_number'],
            'address': data.get('address'),  # Optional
            'status': data.get('status', 'active'),
            'created_by': data.get('created_by', 'bazar@bbhc')
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
def register_seller():
    """Register a new seller"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate is_active if provided (should be boolean)
        if 'is_active' in data and not isinstance(data['is_active'], bool):
            return jsonify({'error': 'is_active must be a boolean'}), 400
        
        # Prepare seller data
        seller_data = {
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],  # Will be hashed in service
            'first_name': data.get('first_name'),  # Optional
            'last_name': data.get('last_name'),  # Optional
            'is_active': data.get('is_active', True),  # Default to True
            'is_admin': data.get('is_admin', False)  # Default to False
        }
        
        # Create seller
        seller = UserService.create_user(seller_data)
        
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
