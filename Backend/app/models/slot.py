"""
Slot model for MongoDB persistence
"""
from datetime import datetime, timezone
from bson import ObjectId


class Slot:
    """Represents a physical slot in the outlet."""

    def __init__(
        self,
        slot_number,
        user_id=None,
        item_count=0,
        created_at=None,
        updated_at=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.slot_number = slot_number
        self.user_id = user_id if isinstance(user_id, ObjectId) or user_id is None else ObjectId(user_id)
        self.item_count = item_count
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)

    def to_dict(self):
        """Return a JSON-serializable representation."""
        return {
            'id': str(self._id),
            'slot_number': self.slot_number,
            'user_id': str(self.user_id) if self.user_id else None,
            'item_count': self.item_count,
            'createdAt': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updatedAt': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }

    def to_bson(self):
        """Return Mongo-ready document."""
        return {
            '_id': self._id,
            'slot_number': self.slot_number,
            'user_id': self.user_id,
            'item_count': self.item_count,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            slot_number=bson_doc.get('slot_number'),
            user_id=bson_doc.get('user_id'),
            item_count=bson_doc.get('item_count', 0),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )
