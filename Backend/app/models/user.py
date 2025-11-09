"""
User model for MongoDB
"""
from datetime import datetime
from bson import ObjectId
import bcrypt


class User:
    """User model for authentication and user management"""
    
    def __init__(self, username, email, password_hash, first_name=None, 
                 last_name=None, is_active=True, is_admin=False, 
                 created_at=None, updated_at=None, _id=None):
        self._id = _id or ObjectId()
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = is_active
        self.is_admin = is_admin
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
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
        """Convert user to dictionary"""
        user_dict = {
            'id': str(self._id),
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }
        if include_password:
            user_dict['password_hash'] = self.password_hash
        return user_dict
    
    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create User instance from dictionary"""
        if '_id' in data:
            data['_id'] = ObjectId(data['_id']) if not isinstance(data['_id'], ObjectId) else data['_id']
        return cls(**data)
    
    @classmethod
    def from_bson(cls, bson_doc):
        """Create User instance from MongoDB document"""
        if bson_doc is None:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            username=bson_doc.get('username'),
            email=bson_doc.get('email'),
            password_hash=bson_doc.get('password_hash'),
            first_name=bson_doc.get('first_name'),
            last_name=bson_doc.get('last_name'),
            is_active=bson_doc.get('is_active', True),
            is_admin=bson_doc.get('is_admin', False),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )
    
    def __repr__(self):
        return f'<User {self.username}>'

