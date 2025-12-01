"""
Bag model for MongoDB storage
"""
from datetime import datetime
from bson import ObjectId


class Bag:
    """Bag model for storing user's shopping bag items"""

    def __init__(
        self,
        user_id,
        product_id,
        quantity=1,
        selected_size=None,
        selected_color=None,
        created_at=None,
        updated_at=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.user_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        self.product_id = ObjectId(product_id) if not isinstance(product_id, ObjectId) else product_id
        self.quantity = quantity
        self.selected_size = selected_size
        self.selected_color = selected_color
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        """Convert bag item to dictionary"""
        return {
            'id': str(self._id),
            'user_id': str(self.user_id),
            'product_id': str(self.product_id),
            'quantity': self.quantity,
            'selected_size': self.selected_size,
            'selected_color': self.selected_color,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }

    def to_bson(self):
        """Convert to BSON document for MongoDB"""
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'selected_size': self.selected_size,
            'selected_color': self.selected_color,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        """Create Bag instance from MongoDB document"""
        if not bson_doc:
            return None

        return cls(
            _id=bson_doc.get('_id'),
            user_id=bson_doc.get('user_id'),
            product_id=bson_doc.get('product_id'),
            quantity=bson_doc.get('quantity', 1),
            selected_size=bson_doc.get('selected_size'),
            selected_color=bson_doc.get('selected_color'),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

    def __repr__(self):
        return f'<Bag user_id={self.user_id} product_id={self.product_id} quantity={self.quantity}>'

