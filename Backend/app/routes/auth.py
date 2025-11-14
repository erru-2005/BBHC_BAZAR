"""
Authentication routes with OTP support
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token
from app.services.master_service import MasterService
from app.services.user_service import UserService
from app.utils.otp import OTPManager

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/master/login', methods=['POST'])
def master_login():
    """
    Master login endpoint - validates credentials and returns OTP session
    Expects: { "username": "...", "password": "..." }
    Returns: { "message": "...", "otp_session_id": "...", "otp": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Authenticate master
        master = MasterService.get_master_by_username(username)
        if not master:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not master.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if master.status != 'active':
            return jsonify({'error': 'Account is not active'}), 403
        
        user_id = str(master._id)
        
        # Generate OTP
        otp = OTPManager.generate_otp()
        session_id = OTPManager.store_otp(user_id, 'master', otp)
        
        # In production, send OTP via email/SMS
        # For now, return OTP in response (remove in production)
        return jsonify({
            'message': 'OTP sent successfully',
            'otp_session_id': session_id,
            'otp': otp  # Remove this in production - only for development
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/seller/login', methods=['POST'])
def seller_login():
    """
    Seller login endpoint - validates credentials and returns OTP session
    Expects: { "username": "...", "password": "..." }
    Returns: { "message": "...", "otp_session_id": "...", "otp": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Authenticate seller
        seller = UserService.get_user_by_username(username)
        if not seller:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not seller.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not seller.is_active:
            return jsonify({'error': 'Account is not active'}), 403
        
        user_id = str(seller._id)
        
        # Generate OTP
        otp = OTPManager.generate_otp()
        session_id = OTPManager.store_otp(user_id, 'seller', otp)
        
        # In production, send OTP via email/SMS
        # For now, return OTP in response (remove in production)
        return jsonify({
            'message': 'OTP sent successfully',
            'otp_session_id': session_id,
            'otp': otp  # Remove this in production - only for development
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify OTP and return JWT tokens
    Expects: { "otp_session_id": "...", "otp": "..." }
    Returns: { "message": "...", "access_token": "...", "refresh_token": "...", "user": {...} }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        session_id = data.get('otp_session_id')
        otp = data.get('otp')
        
        if not session_id or not otp:
            return jsonify({'error': 'OTP session ID and OTP are required'}), 400
        
        # Verify OTP
        user_info, error = OTPManager.verify_otp(session_id, otp)
        
        if error:
            return jsonify({'error': error}), 400
        
        # Get user data
        user = None
        user_dict = None
        
        if user_info['user_type'] == 'master':
            master = MasterService.get_master_by_id(user_info['user_id'])
            if not master:
                return jsonify({'error': 'User not found'}), 404
            user_dict = master.to_dict()
        else:  # seller
            seller = UserService.get_user_by_id(user_info['user_id'])
            if not seller:
                return jsonify({'error': 'User not found'}), 404
            user_dict = seller.to_dict()
        
        # Create JWT tokens
        additional_claims = {
            'user_type': user_info['user_type'],
            'user_id': user_info['user_id']
        }
        
        access_token = create_access_token(
            identity=user_info['user_id'],
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=user_info['user_id'],
            additional_claims=additional_claims
        )
        
        return jsonify({
            'message': 'OTP verified successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_dict,
            'userType': user_info['user_type']
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'OTP verification failed: {str(e)}'}), 500
