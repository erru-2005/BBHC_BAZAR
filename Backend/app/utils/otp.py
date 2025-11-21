"""
OTP utility for generating and verifying OTPs
"""
import random
import string
from datetime import datetime, timedelta
from app import mongo


class OTPManager:
    """Manager class for OTP generation and verification"""
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10
    
    @staticmethod
    def generate_otp():
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=OTPManager.OTP_LENGTH))
    
    @staticmethod
    def store_otp(user_id, user_type, otp, phone_number=None):
        """Store OTP in database with expiry"""
        expires_at = datetime.utcnow() + timedelta(minutes=OTPManager.OTP_EXPIRY_MINUTES)
        
        otp_data = {
            'user_id': user_id,
            'user_type': user_type,  # 'master', 'seller', or 'user'
            'otp': otp,
            'expires_at': expires_at,
            'created_at': datetime.utcnow(),
            'verified': False
        }
        
        # Store phone_number if provided (for user registration)
        if phone_number:
            otp_data['phone_number'] = phone_number
        
        # Store in otp_sessions collection
        result = mongo.db.otp_sessions.insert_one(otp_data)
        return str(result.inserted_id)
    
    @staticmethod
    def verify_otp(session_id, otp):
        """Verify OTP and return user info if valid"""
        try:
            from bson import ObjectId
            session = mongo.db.otp_sessions.find_one({
                '_id': ObjectId(session_id),
                'verified': False
            })
            
            if not session:
                return None, "Invalid or expired OTP session"
            
            # Check if expired
            if datetime.utcnow() > session['expires_at']:
                # Delete expired session
                mongo.db.otp_sessions.delete_one({'_id': ObjectId(session_id)})
                return None, "OTP has expired"
            
            # Verify OTP
            if session['otp'] != otp:
                return None, "Invalid OTP"
            
            # Mark as verified
            mongo.db.otp_sessions.update_one(
                {'_id': ObjectId(session_id)},
                {'$set': {'verified': True}}
            )
            
            user_info = {
                'user_id': session['user_id'],
                'user_type': session['user_type']
            }
            
            # Include phone_number if present
            if 'phone_number' in session:
                user_info['phone_number'] = session['phone_number']
            
            return user_info, None
            
        except Exception as e:
            return None, f"Error verifying OTP: {str(e)}"
    
    @staticmethod
    def cleanup_expired_otps():
        """Clean up expired OTP sessions"""
        try:
            result = mongo.db.otp_sessions.delete_many({
                'expires_at': {'$lt': datetime.utcnow()}
            })
            return result.deleted_count
        except Exception:
            return 0

