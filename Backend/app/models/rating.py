"""
Rating model for MongoDB storage
"""
from datetime import datetime
from bson import ObjectId


class Rating:
    """Rating model for product ratings"""

    def __init__(
        self,
        product_id,
        user_id,
        seller_id=None,
        rating=0,  # 1-5 stars
        review_text=None,
        created_at=None,
        updated_at=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.product_id = ObjectId(product_id) if isinstance(product_id, str) else product_id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
        self.seller_id = ObjectId(seller_id) if seller_id and isinstance(seller_id, str) else seller_id
        self.rating = rating  # 1-5 stars
        self.review_text = review_text
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        """Convert rating to dictionary for API responses"""
        return {
            'id': str(self._id),
            'product_id': str(self.product_id),
            'user_id': str(self.user_id),
            'seller_id': str(self.seller_id) if self.seller_id else None,
            'rating': self.rating,
            'review_text': self.review_text,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }

    def to_bson(self):
        """Convert rating to BSON document for MongoDB"""
        doc = {
            '_id': self._id,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'rating': self.rating,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        if self.seller_id:
            doc['seller_id'] = self.seller_id
        if self.review_text:
            doc['review_text'] = self.review_text
        return doc

    @classmethod
    def from_bson(cls, bson_doc):
        """Create Rating instance from MongoDB document"""
        if not bson_doc:
            return None

        return cls(
            _id=bson_doc.get('_id'),
            product_id=bson_doc.get('product_id'),
            user_id=bson_doc.get('user_id'),
            seller_id=bson_doc.get('seller_id'),
            rating=bson_doc.get('rating', 0),
            review_text=bson_doc.get('review_text'),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

    def __repr__(self):
        return f'<Rating {self.rating} stars for product {self.product_id} by user {self.user_id}>'

