import secrets
from datetime import datetime, timezone, timedelta
from app import mongo

def create_opaque_refresh_token(user_id, user_type, device_id=None):
    """
    Generate an opaque refresh token and store it in the database.
    """
    token = secrets.token_hex(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    mongo.db.refresh_tokens.insert_one({
        'user_id': str(user_id),
        'user_type': user_type,
        'device_id': device_id,
        'token': token,
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc)
    })
    return token

def verify_opaque_refresh_token(token, device_id=None):
    """
    Verify the opaque refresh token, checking expiration and device_id matching.
    """
    if not token:
        return None, "No refresh token provided."
        
    doc = mongo.db.refresh_tokens.find_one({'token': token})
    if not doc:
        return None, "Invalid refresh token."
        
    now = datetime.now(timezone.utc)
    expires_at = doc['expires_at']
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        mongo.db.refresh_tokens.delete_one({'_id': doc['_id']})
        return None, "Refresh token expired."

        
    if device_id and doc.get('device_id') and doc.get('device_id') != device_id:
        return None, "Device ID mismatch."
        
    return doc, None

def revoke_opaque_refresh_token(token):
    mongo.db.refresh_tokens.delete_one({'token': token})
