"""
Blacklist model for MongoDB
"""
from datetime import datetime
from bson import ObjectId


class Blacklist:
    """Blacklist model for blacklisting sellers and outlet men"""
    
    def __init__(self, user_id, user_type, blacklisted_by, reason=None, blacklisted_at=None, _id=None):
        self._id = _id or ObjectId()
        self.user_id = user_id  # ObjectId of the seller or outlet_man
        self.user_type = user_type  # 'seller' or 'outlet_man'
        self.blacklisted_by = blacklisted_by  # User ID who blacklisted
        self.reason = reason
        self.blacklisted_at = blacklisted_at or datetime.utcnow()
    
    def to_dict(self):
        """Convert blacklist to dictionary"""
        return {
            'id': str(self._id),
            'user_id': str(self.user_id),
            'user_type': self.user_type,
            'blacklisted_by': self.blacklisted_by,
            'reason': self.reason,
            'blacklisted_at': self.blacklisted_at.isoformat() if isinstance(self.blacklisted_at, datetime) else self.blacklisted_at
        }
    
    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'user_type': self.user_type,
            'blacklisted_by': self.blacklisted_by,
            'reason': self.reason,
            'blacklisted_at': self.blacklisted_at
        }
    
    @classmethod
    def from_bson(cls, bson_doc):
        """Create Blacklist instance from MongoDB document"""
        if bson_doc is None:
            return None
        # Support legacy format (seller_id) for backward compatibility
        user_id = bson_doc.get('user_id') or bson_doc.get('seller_id')
        user_type = bson_doc.get('user_type', 'seller')  # Default to 'seller' for legacy entries
        return cls(
            _id=bson_doc.get('_id'),
            user_id=user_id,
            user_type=user_type,
            blacklisted_by=bson_doc.get('blacklisted_by'),
            reason=bson_doc.get('reason'),
            blacklisted_at=bson_doc.get('blacklisted_at')
        )
    
    def __repr__(self):
        return f'<Blacklist user_id={self.user_id} user_type={self.user_type}>'

