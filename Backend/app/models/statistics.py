"""
Statistics model for MongoDB
Tracks revenue and commissions
"""
from datetime import datetime
from bson import ObjectId


class Statistics:
    """Represents statistics data for analytics"""

    def __init__(
        self,
        date,
        revenue=0,
        commissions=0,
        seller_id=None,
        seller_revenue=0,
        seller_commission=0,
        created_at=None,
        updated_at=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.date = date  # Date string in YYYY-MM-DD or YYYY-MM format
        self.revenue = revenue
        self.commissions = commissions
        self.seller_id = seller_id
        self.seller_revenue = seller_revenue
        self.seller_commission = seller_commission
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        return {
            'id': str(self._id),
            'date': self.date,
            'revenue': self.revenue,
            'commissions': self.commissions,
            'seller_id': str(self.seller_id) if self.seller_id else None,
            'seller_revenue': self.seller_revenue,
            'seller_commission': self.seller_commission,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }

    def to_bson(self):
        return {
            '_id': self._id,
            'date': self.date,
            'revenue': self.revenue,
            'commissions': self.commissions,
            'seller_id': self.seller_id,
            'seller_revenue': self.seller_revenue,
            'seller_commission': self.seller_commission,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            date=bson_doc.get('date'),
            revenue=bson_doc.get('revenue', 0),
            commissions=bson_doc.get('commissions', 0),
            seller_id=bson_doc.get('seller_id'),
            seller_revenue=bson_doc.get('seller_revenue', 0),
            seller_commission=bson_doc.get('seller_commission', 0),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

