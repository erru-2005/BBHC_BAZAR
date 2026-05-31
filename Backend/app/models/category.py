"""
Category model for MongoDB
"""
from datetime import datetime, timezone
from bson import ObjectId


class Category:
    """Represents a product or service category"""

    VALID_TYPES = ('product', 'service')

    def __init__(self, name, created_by='system', category_type='product', created_at=None, _id=None):
        self._id = _id or ObjectId()
        self.name = name
        self.created_by = created_by
        self.category_type = category_type if category_type in self.VALID_TYPES else 'product'
        self.created_at = created_at or datetime.now(timezone.utc)

    def to_dict(self):
        return {
            'id': str(self._id),
            'name': self.name,
            'category_type': self.category_type,
            'type': self.category_type,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }

    def to_bson(self):
        return {
            '_id': self._id,
            'name': self.name,
            'category_type': self.category_type,
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
            category_type=bson_doc.get('category_type', 'product'),
            created_at=bson_doc.get('created_at')
        )

    def __repr__(self):
        return f'<Category {self.name}>'


