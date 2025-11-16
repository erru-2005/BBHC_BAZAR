"""
Blacklist model for MongoDB
"""
from datetime import datetime
from bson import ObjectId


class Blacklist:
    """Blacklist model for blacklisting sellers"""
    
    def __init__(self, seller_id, blacklisted_by, reason=None, blacklisted_at=None, _id=None):
        self._id = _id or ObjectId()
        self.seller_id = seller_id  # ObjectId of the seller
        self.blacklisted_by = blacklisted_by  # User ID who blacklisted
        self.reason = reason
        self.blacklisted_at = blacklisted_at or datetime.utcnow()
    
    def to_dict(self):
        """Convert blacklist to dictionary"""
        return {
            'id': str(self._id),
            'seller_id': str(self.seller_id),
            'blacklisted_by': self.blacklisted_by,
            'reason': self.reason,
            'blacklisted_at': self.blacklisted_at.isoformat() if isinstance(self.blacklisted_at, datetime) else self.blacklisted_at
        }
    
    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'seller_id': self.seller_id,
            'blacklisted_by': self.blacklisted_by,
            'reason': self.reason,
            'blacklisted_at': self.blacklisted_at
        }
    
    @classmethod
    def from_bson(cls, bson_doc):
        """Create Blacklist instance from MongoDB document"""
        if bson_doc is None:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            seller_id=bson_doc.get('seller_id'),
            blacklisted_by=bson_doc.get('blacklisted_by'),
            reason=bson_doc.get('reason'),
            blacklisted_at=bson_doc.get('blacklisted_at')
        )
    
    def __repr__(self):
        return f'<Blacklist seller_id={self.seller_id}>'

