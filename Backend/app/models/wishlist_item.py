from bson import ObjectId
from datetime import datetime


class WishlistItem:
    """
    Wishlist item model.
    Stores only user_id and product_id references - product data is fetched when needed.
    """

    def __init__(
        self,
        _id=None,
        user_id=None,
        product_id=None,
        created_at=None,
        metadata=None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if user_id and not isinstance(user_id, ObjectId) else user_id
        self.product_id = ObjectId(product_id) if product_id and not isinstance(product_id, ObjectId) else product_id
        self.created_at = created_at or datetime.utcnow()
        self.metadata = metadata or {}

    def to_bson(self):
        doc = {
            "user_id": self.user_id,
            "product_id": self.product_id,
            "created_at": self.created_at,
            "metadata": self.metadata,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_bson(cls, data):
        if not data:
            return None
        return cls(
            _id=data.get("_id"),
            user_id=data.get("user_id"),
            product_id=data.get("product_id"),
            created_at=data.get("created_at"),
            metadata=data.get("metadata", {}),
        )

    def to_dict(self):
        return {
            "id": str(self._id) if self._id else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "product_id": str(self.product_id) if self.product_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "metadata": self.metadata,
        }


