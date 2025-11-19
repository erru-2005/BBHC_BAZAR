"""
Product model for MongoDB storage
"""
from datetime import datetime
from bson import ObjectId


class Product:
    """Product model encapsulating marketplace product data"""

    def __init__(
        self,
        product_name,
        specification,
        points,
        thumbnail,
        selling_price=None,
        max_price=None,
        gallery=None,
        categories=None,
        created_by='system',
        created_by_user_id=None,
        created_by_user_type=None,
        created_at=None,
        updated_at=None,
        registration_ip=None,
        registration_user_agent=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.product_name = product_name
        self.specification = specification
        self.points = points or []
        self.thumbnail = thumbnail
        self.selling_price = selling_price
        self.max_price = max_price
        self.gallery = gallery or []
        self.categories = categories or []
        self.created_by = created_by
        self.created_by_user_id = created_by_user_id
        self.created_by_user_type = created_by_user_type
        self.registration_ip = registration_ip
        self.registration_user_agent = registration_user_agent
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        return {
            'id': str(self._id),
            'product_name': self.product_name,
            'specification': self.specification,
            'points': self.points,
            'thumbnail': self.thumbnail,
            'selling_price': self.selling_price,
            'max_price': self.max_price,
            'gallery': self.gallery,
            'categories': self.categories,
            'created_by': self.created_by,
            'created_by_user_id': self.created_by_user_id,
            'created_by_user_type': self.created_by_user_type,
            'registration_ip': self.registration_ip,
            'registration_user_agent': self.registration_user_agent,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        }

    def to_bson(self):
        return {
            '_id': self._id,
            'product_name': self.product_name,
            'specification': self.specification,
            'points': self.points,
            'thumbnail': self.thumbnail,
            'selling_price': self.selling_price,
            'max_price': self.max_price,
            'gallery': self.gallery,
            'categories': self.categories,
            'created_by': self.created_by,
            'created_by_user_id': self.created_by_user_id,
            'created_by_user_type': self.created_by_user_type,
            'registration_ip': self.registration_ip,
            'registration_user_agent': self.registration_user_agent,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None

        return cls(
            _id=bson_doc.get('_id'),
            product_name=bson_doc.get('product_name'),
            specification=bson_doc.get('specification'),
            points=bson_doc.get('points', []),
            thumbnail=bson_doc.get('thumbnail'),
            selling_price=bson_doc.get('selling_price'),
            max_price=bson_doc.get('max_price'),
            gallery=bson_doc.get('gallery', []),
            categories=bson_doc.get('categories', []),
            created_by=bson_doc.get('created_by', 'system'),
            created_by_user_id=bson_doc.get('created_by_user_id'),
            created_by_user_type=bson_doc.get('created_by_user_type'),
            registration_ip=bson_doc.get('registration_ip'),
            registration_user_agent=bson_doc.get('registration_user_agent'),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

    def __repr__(self):
        return f'<Product {self.product_name}>'


