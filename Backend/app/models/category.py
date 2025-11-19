"""
Category model for MongoDB
"""
from datetime import datetime
from bson import ObjectId


class Category:
    """Represents a product category"""

    def __init__(self, name, created_by='system', created_at=None, _id=None):
        self._id = _id or ObjectId()
        self.name = name
        self.created_by = created_by
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self):
        return {
            'id': str(self._id),
            'name': self.name,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }

    def to_bson(self):
        return {
            '_id': self._id,
            'name': self.name,
            'created_by': self.created_by,
            'created_at': self.created_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            name=bson_doc.get('name'),
            created_by=bson_doc.get('created_by', 'system'),
            created_at=bson_doc.get('created_at')
        )

    def __repr__(self):
        return f'<Category {self.name}>'


