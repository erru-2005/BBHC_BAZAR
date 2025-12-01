"""
Outlet Man model for MongoDB
"""
from datetime import datetime
from bson import ObjectId
import bcrypt


class OutletMan:
    """Outlet Man model for outlet man user management"""
    
    def __init__(self, outlet_access_code, email, password_hash, phone_number=None,
                 first_name=None, last_name=None, is_active=False, created_by="system",
                 created_at=None, _id=None):
        self._id = _id or ObjectId()
        self.outlet_access_code = outlet_access_code
        self.email = email
        self.password_hash = password_hash
        self.phone_number = phone_number
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = is_active
        self.created_by = created_by
        self.created_at = created_at or datetime.utcnow()
    
    @staticmethod
    def set_password(password):
        """Hash and set password"""
        return bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
    
    def check_password(self, password):
        """Check if password matches"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )
    
    def to_dict(self, include_password=False):
        """Convert outlet man to dictionary"""
        outlet_man_dict = {
            'id': str(self._id),
            'outlet_access_code': self.outlet_access_code,
            'email': self.email,
            'phone_number': self.phone_number,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }
        if include_password:
            outlet_man_dict['password_hash'] = self.password_hash
        return outlet_man_dict
    
    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'outlet_access_code': self.outlet_access_code,
            'email': self.email,
            'password_hash': self.password_hash,
            'phone_number': self.phone_number,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create OutletMan instance from dictionary"""
        if '_id' in data:
            data['_id'] = ObjectId(data['_id']) if not isinstance(data['_id'], ObjectId) else data['_id']
        return cls(**data)
    
    @classmethod
    def from_bson(cls, bson_doc):
        """Create OutletMan instance from MongoDB document"""
        if bson_doc is None:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            outlet_access_code=bson_doc.get('outlet_access_code'),
            email=bson_doc.get('email'),
            password_hash=bson_doc.get('password_hash'),
            phone_number=bson_doc.get('phone_number'),
            first_name=bson_doc.get('first_name'),
            last_name=bson_doc.get('last_name'),
            is_active=bson_doc.get('is_active', False),
            created_by=bson_doc.get('created_by', 'system'),
            created_at=bson_doc.get('created_at')
        )
    
    def __repr__(self):
        return f'<OutletMan {self.outlet_access_code}>'

