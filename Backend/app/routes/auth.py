"""
Authentication routes with OTP support
"""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.services.master_service import MasterService
from app.services.seller_service import SellerService
from app.utils.otp import OTPManager
from app.utils.sms import SMSService
from app.utils.device import DeviceTokenManager

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def mask_phone_number(phone_number):
    """Mask phone number to show only last 4 digits"""
    if not phone_number:
        return None
    phone_str = str(phone_number).strip()
    if len(phone_str) <= 4:
        return phone_str
    # Show last 4 digits, mask the rest
    masked = '*' * (len(phone_str) - 4) + phone_str[-4:]
    return masked


@auth_bp.route('/master/login', methods=['POST'])
def master_login():
    """
    Master login endpoint - validates credentials and checks device token
    Expects: { "username": "...", "password": "...", "device_id": "...", "device_token": "..." }
    Returns: 
        - If device token valid: { "message": "...", "access_token": "...", "user": {...}, "skip_otp": true }
        - If device token invalid/missing: { "message": "...", "otp_session_id": "...", "user": {...}, "phone_number": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        username = data.get('username')
        password = data.get('password')
        device_id = data.get('device_id')
        device_token = data.get('device_token')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Authenticate master
        master = MasterService.get_master_by_username(username)
        if not master:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not master.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Note: Status will be automatically updated to 'active' when socket connects
        # We don't block login based on status - status is managed by socket connection
        
        user_id = str(master._id)
        user_data = master.to_dict(include_password=False)
        
        # Log device token status
        if device_id and not device_token:
            print(f"[DEBUG] Device ID provided but no device token for master: user_id={user_id}, device_id={device_id}")
        elif not device_id and device_token:
            print(f"[DEBUG] Device token provided but no device ID for master: user_id={user_id}")
        elif device_id and device_token:
            print(f"[DEBUG] Both device ID and token provided for master: user_id={user_id}, device_id={device_id}")
        
        # Check device token if provided
        if device_id and device_token:
            print(f"[DEBUG] Checking device token for master: user_id={user_id}, device_id={device_id}, has_token={bool(device_token)}")
            is_valid, error = DeviceTokenManager.verify_device_token(
                user_id, 'master', device_id, device_token
            )
            print(f"[DEBUG] Device token verification result: is_valid={is_valid}, error={error}")
            
            if is_valid:
                # Device token is valid, skip OTP and return JWT tokens
                additional_claims = {
                    'user_type': 'master',
                    'user_id': user_id,
                    'username': master.username
                }
                
                access_token = create_access_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                refresh_token = create_refresh_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                
                return jsonify({
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user_data,
                    'userType': 'master',
                    'skip_otp': True
                }), 200
        
        # If device_id is provided but no device_token, check if device exists (device was logged out but device_id preserved)
        if device_id and not device_token:
            print(f"[DEBUG] Checking if device exists for master: user_id={user_id}, device_id={device_id}")
            device_exists = DeviceTokenManager.check_device_exists(user_id, 'master', device_id)
            print(f"[DEBUG] Device existence check result: device_exists={device_exists}")
            
            if device_exists:
                # Device exists and is not expired, skip OTP and return JWT tokens
                # Also create/update device token for future logins
                device_token = DeviceTokenManager.create_device_token(user_id, 'master', device_id)
                
                additional_claims = {
                    'user_type': 'master',
                    'user_id': user_id,
                    'username': master.username
                }
                
                access_token = create_access_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                refresh_token = create_refresh_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                
                return jsonify({
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user_data,
                    'userType': 'master',
                    'skip_otp': True,
                    'device_token': device_token  # Return device token to frontend
                }), 200
        
        # Device token invalid or not provided, proceed with OTP flow
        # Generate OTP
        otp = OTPManager.generate_otp()
        session_id = OTPManager.store_otp(user_id, 'master', otp)
        
        # Get masked phone number (last 4 digits)
        masked_phone = mask_phone_number(master.phone_number) if master.phone_number else None
        
        # Send OTP via SMS if phone number is available
        sms_sent = False
        sms_error = None
        if master.phone_number:
            try:
                success, message = SMSService.send_otp(master.phone_number, otp)
                if success:
                    sms_sent = True
                else:
                    sms_error = message
            except Exception as e:
                sms_error = str(e)
        
        # OTP is NOT returned in response for security
        response_data = {
            'message': 'OTP sent successfully',
            'otp_session_id': session_id,
            'user': user_data,
            'phone_number': masked_phone,  # Masked phone number (last 4 digits)
            'skip_otp': False
        }
        
        # Include SMS status in development mode for debugging
        if current_app.config.get('DEBUG'):
            response_data['sms_sent'] = sms_sent
            if sms_error:
                response_data['sms_error'] = sms_error
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/seller/login', methods=['POST'])
def seller_login():
    """
    Seller login endpoint - validates credentials and checks device token
    Expects: { "trade_id": "...", "password": "...", "device_id": "...", "device_token": "..." }
    Returns: 
        - If device token valid: { "message": "...", "access_token": "...", "user": {...}, "skip_otp": true }
        - If device token invalid/missing: { "message": "...", "otp_session_id": "...", "user": {...}, "phone_number": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        trade_id = data.get('trade_id')
        password = data.get('password')
        device_id = data.get('device_id')
        device_token = data.get('device_token')
        
        if not trade_id or not password:
            return jsonify({'error': 'Trade ID and password are required'}), 400
        
        # Check if seller is blacklisted (check before authentication)
        from app.services.blacklist_service import BlacklistService
        seller_temp = SellerService.get_seller_by_trade_id(trade_id, include_blacklisted=True)
        if not seller_temp:
            return jsonify({'error': 'Invalid Trade ID or password'}), 401
        
        # Check if blacklisted
        if BlacklistService.is_blacklisted(str(seller_temp._id)):
            return jsonify({'error': 'This account has been blacklisted. Please contact support.'}), 403
        
        # Authenticate seller
        seller = seller_temp
        if not seller.check_password(password):
            return jsonify({'error': 'Invalid Trade ID or password'}), 401
        
        # Note: Status will be automatically updated to active when socket connects
        # We don't block login based on status - status is managed by socket connection
        
        user_id = str(seller._id)
        user_data = seller.to_dict(include_password=False)
        
        # Log device token status
        if device_id and not device_token:
            print(f"[DEBUG] Device ID provided but no device token for seller: user_id={user_id}, device_id={device_id}")
        elif not device_id and device_token:
            print(f"[DEBUG] Device token provided but no device ID for seller: user_id={user_id}")
        elif device_id and device_token:
            print(f"[DEBUG] Both device ID and token provided for seller: user_id={user_id}, device_id={device_id}")
        
        # Check device token if provided
        if device_id and device_token:
            print(f"[DEBUG] Checking device token for seller: user_id={user_id}, device_id={device_id}, has_token={bool(device_token)}")
            is_valid, error = DeviceTokenManager.verify_device_token(
                user_id, 'seller', device_id, device_token
            )
            print(f"[DEBUG] Device token verification result: is_valid={is_valid}, error={error}")
            
            if is_valid:
                # Device token is valid, skip OTP and return JWT tokens
                additional_claims = {
                    'user_type': 'seller',
                    'user_id': user_id,
                    'trade_id': seller.trade_id
                }
                
                access_token = create_access_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                refresh_token = create_refresh_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                
                return jsonify({
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user_data,
                    'userType': 'seller',
                    'skip_otp': True
                }), 200
        
        # If device_id is provided but no device_token, check if device exists (device was logged out but device_id preserved)
        if device_id and not device_token:
            print(f"[DEBUG] Checking if device exists for seller: user_id={user_id}, device_id={device_id}")
            device_exists = DeviceTokenManager.check_device_exists(user_id, 'seller', device_id)
            print(f"[DEBUG] Device existence check result: device_exists={device_exists}")
            
            if device_exists:
                # Device exists and is not expired, skip OTP and return JWT tokens
                # Also create/update device token for future logins
                device_token = DeviceTokenManager.create_device_token(user_id, 'seller', device_id)
                
                additional_claims = {
                    'user_type': 'seller',
                    'user_id': user_id,
                    'trade_id': seller.trade_id
                }
                
                access_token = create_access_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                refresh_token = create_refresh_token(
                    identity=user_id,
                    additional_claims=additional_claims
                )
                
                return jsonify({
                    'message': 'Login successful',
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user_data,
                    'userType': 'seller',
                    'skip_otp': True,
                    'device_token': device_token  # Return device token to frontend
                }), 200
        
        # Device token invalid or not provided, proceed with OTP flow
        # Generate OTP
        otp = OTPManager.generate_otp()
        session_id = OTPManager.store_otp(user_id, 'seller', otp)
        
        # Check if seller has phone_number (required for OTP)
        phone_number = seller.phone_number if hasattr(seller, 'phone_number') and seller.phone_number else None
        
        if not phone_number:
            return jsonify({
                'error': 'Phone number is required for seller login. Please contact administrator to add phone number to your account.'
            }), 400
        
        # Get masked phone number
        masked_phone = mask_phone_number(phone_number)
        
        # Send OTP via SMS
        sms_sent = False
        sms_error = None
        try:
            success, message = SMSService.send_otp(phone_number, otp)
            if success:
                sms_sent = True
            else:
                sms_error = message
        except Exception as e:
            sms_error = str(e)
        
        # OTP is NOT returned in response for security
        response_data = {
            'message': 'OTP sent successfully',
            'otp_session_id': session_id,
            'user': user_data,
            'phone_number': masked_phone,  # Masked phone number (last 4 digits)
            'skip_otp': False
        }
        
        # Include SMS status in development mode for debugging
        if current_app.config.get('DEBUG'):
            response_data['sms_sent'] = sms_sent
            if sms_error:
                response_data['sms_error'] = sms_error
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify OTP and return JWT tokens, create device token
    Expects: { "otp_session_id": "...", "otp": "...", "device_id": "..." }
    Returns: { "message": "...", "access_token": "...", "refresh_token": "...", "user": {...}, "device_token": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        session_id = data.get('otp_session_id')
        otp = data.get('otp')
        device_id = data.get('device_id')
        
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
            username = master.username
        else:  # seller
            seller = SellerService.get_seller_by_id(user_info['user_id'])
            if not seller:
                return jsonify({'error': 'User not found'}), 404
            user_dict = seller.to_dict()
            username = seller.trade_id
        
        # Create JWT tokens
        additional_claims = {
            'user_type': user_info['user_type'],
            'user_id': user_info['user_id'],
            'username': username
        }
        
        access_token = create_access_token(
            identity=user_info['user_id'],
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=user_info['user_id'],
            additional_claims=additional_claims
        )
        
        # Create device token if device_id is provided
        device_token = None
        if device_id:
            device_token = DeviceTokenManager.create_device_token(
                user_info['user_id'],
                user_info['user_type'],
                device_id
            )
        
        response_data = {
            'message': 'OTP verified successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_dict,
            'userType': user_info['user_type']
        }
        
        if device_token:
            response_data['device_token'] = device_token
            response_data['device_id'] = device_id
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'OTP verification failed: {str(e)}'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user data"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if not current_user_id or not user_type:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Get user data based on type
        if user_type == 'master':
            master = MasterService.get_master_by_id(current_user_id)
            if not master:
                return jsonify({'error': 'User not found'}), 404
            user_data = master.to_dict(include_password=False)
        else:  # seller
            seller = SellerService.get_seller_by_id(current_user_id)
            if not seller:
                return jsonify({'error': 'User not found'}), 404
            user_data = seller.to_dict(include_password=False)
        
        return jsonify({
            'user': user_data,
            'userType': user_type
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get user: {str(e)}'}), 500
