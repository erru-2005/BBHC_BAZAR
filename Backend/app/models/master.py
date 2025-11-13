"""
Master model for MongoDB
"""
from datetime import datetime
from bson import ObjectId
import bcrypt


class Master:
    """Master model for master user management"""
    
    def __init__(self, name, username, email, password_hash, phone_number, 
                 address=None, status="active", created_by="bazar@bbhc",
                 created_at=None, _id=None):
        self._id = _id or ObjectId()
        self.name = name
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.phone_number = phone_number
        self.address = address
        self.status = status
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
        """Convert master to dictionary"""
        master_dict = {
            'id': str(self._id),
            'name': self.name,
            'username': self.username,
            'email': self.email,
            'phone_number': self.phone_number,
            'address': self.address,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }
        if include_password:
            master_dict['password_hash'] = self.password_hash
        return master_dict
    
    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'name': self.name,
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,
            'phone_number': self.phone_number,
            'address': self.address,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create Master instance from dictionary"""
        if '_id' in data:
            data['_id'] = ObjectId(data['_id']) if not isinstance(data['_id'], ObjectId) else data['_id']
        return cls(**data)
    
    @classmethod
    def from_bson(cls, bson_doc):
        """Create Master instance from MongoDB document"""
        if bson_doc is None:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            name=bson_doc.get('name'),
            username=bson_doc.get('username'),
            email=bson_doc.get('email'),
            password_hash=bson_doc.get('password_hash'),
            phone_number=bson_doc.get('phone_number'),
            address=bson_doc.get('address'),
            status=bson_doc.get('status', 'active'),
            created_by=bson_doc.get('created_by', 'bazar@bbhc'),
            created_at=bson_doc.get('created_at')
        )
    
    def __repr__(self):
        return f'<Master {self.username}>'

