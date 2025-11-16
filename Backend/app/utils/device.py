"""
Device token utility for remembering devices
"""
from datetime import datetime, timedelta
from bson import ObjectId
from app import mongo


class DeviceTokenManager:
    """Manager class for device token generation and verification"""
    
    TOKEN_EXPIRY_DAYS = 14  # 2 weeks
    
    @staticmethod
    def generate_device_id():
        """Generate a unique device ID"""
        import uuid
        return str(uuid.uuid4())
    
    @staticmethod
    def create_device_token(user_id, user_type, device_id):
        """
        Create a device token for a user and device
        
        Args:
            user_id (str): User ID
            user_type (str): 'master' or 'seller'
            device_id (str): Unique device identifier
            
        Returns:
            str: Device token
        """
        # Generate a secure token
        import secrets
        token = secrets.token_urlsafe(32)
        
        # Calculate expiry (2 weeks from now)
        expires_at = datetime.utcnow() + timedelta(days=DeviceTokenManager.TOKEN_EXPIRY_DAYS)
        
        # Store device token
        device_token_data = {
            'user_id': user_id,
            'user_type': user_type,
            'device_id': device_id,
            'token': token,
            'expires_at': expires_at,
            'created_at': datetime.utcnow(),
            'last_used_at': datetime.utcnow()
        }
        
        # Check if device token already exists for this user and device
        existing = mongo.db.device_tokens.find_one({
            'user_id': user_id,
            'user_type': user_type,
            'device_id': device_id
        })
        
        if existing:
            # Update existing token
            mongo.db.device_tokens.update_one(
                {'_id': existing['_id']},
                {
                    '$set': {
                        'token': token,
                        'expires_at': expires_at,
                        'last_used_at': datetime.utcnow()
                    }
                }
            )
        else:
            # Create new token
            mongo.db.device_tokens.insert_one(device_token_data)
        
        return token
    
    @staticmethod
    def verify_device_token(user_id, user_type, device_id, token):
        """
        Verify if a device token is valid
        
        Args:
            user_id (str): User ID
            user_type (str): 'master' or 'seller'
            device_id (str): Device identifier
            token (str): Device token
            
        Returns:
            tuple: (is_valid: bool, error_message: str or None)
        """
        try:
            # Find device token
            device_token = mongo.db.device_tokens.find_one({
                'user_id': user_id,
                'user_type': user_type,
                'device_id': device_id,
                'token': token
            })
            
            if not device_token:
                return False, "Device token not found"
            
            # Check if expired
            if datetime.utcnow() > device_token['expires_at']:
                # Delete expired token
                mongo.db.device_tokens.delete_one({'_id': device_token['_id']})
                return False, "Device token has expired"
            
            # Update last used time
            mongo.db.device_tokens.update_one(
                {'_id': device_token['_id']},
                {'$set': {'last_used_at': datetime.utcnow()}}
            )
            
            return True, None
            
        except Exception as e:
            return False, f"Error verifying device token: {str(e)}"
    
    @staticmethod
    def check_device_exists(user_id, user_type, device_id):
        """
        Check if a device token exists for user and device (without verifying token)
        
        Args:
            user_id (str): User ID
            user_type (str): 'master' or 'seller'
            device_id (str): Device identifier
            
        Returns:
            bool: True if device token exists and is not expired
        """
        try:
            device_token = mongo.db.device_tokens.find_one({
                'user_id': user_id,
                'user_type': user_type,
                'device_id': device_id
            })
            
            if not device_token:
                return False
            
            # Check if expired
            if datetime.utcnow() > device_token['expires_at']:
                # Delete expired token
                mongo.db.device_tokens.delete_one({'_id': device_token['_id']})
                return False
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def revoke_device_token(user_id, user_type, device_id):
        """Revoke a device token"""
        try:
            mongo.db.device_tokens.delete_many({
                'user_id': user_id,
                'user_type': user_type,
                'device_id': device_id
            })
            return True
        except Exception:
            return False
    
    @staticmethod
    def revoke_all_user_devices(user_id, user_type):
        """Revoke all device tokens for a user"""
        try:
            mongo.db.device_tokens.delete_many({
                'user_id': user_id,
                'user_type': user_type
            })
            return True
        except Exception:
            return False
    
    @staticmethod
    def cleanup_expired_tokens():
        """Clean up expired device tokens"""
        try:
            result = mongo.db.device_tokens.delete_many({
                'expires_at': {'$lt': datetime.utcnow()}
            })
            return result.deleted_count
        except Exception:
            return 0

