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
        quantity=0,
        seller_trade_id=None,
        seller_name=None,
        seller_email=None,
        seller_phone=None,
        commission_rate=None,
        total_selling_price=None,
        approval_status=None,
        pending_changes=None,
        original_product_id=None,
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
        self.quantity = quantity
        self.seller_trade_id = seller_trade_id
        self.seller_name = seller_name
        self.seller_email = seller_email
        self.seller_phone = seller_phone
        self.commission_rate = commission_rate
        self.total_selling_price = total_selling_price
        self.approval_status = approval_status  # 'pending', 'approved', 'rejected'
        self.pending_changes = pending_changes  # For edit requests
        self.original_product_id = original_product_id  # For edit requests
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
            'quantity': self.quantity,
            'seller_trade_id': self.seller_trade_id,
            'seller_name': self.seller_name,
            'seller_email': self.seller_email,
            'seller_phone': self.seller_phone,
            'commission_rate': self.commission_rate,
            'total_selling_price': self.total_selling_price,
            'approval_status': self.approval_status,
            'pending_changes': self.pending_changes,
            'original_product_id': self.original_product_id,
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
            'quantity': self.quantity,
            'seller_trade_id': self.seller_trade_id,
            'seller_name': self.seller_name,
            'seller_email': self.seller_email,
            'seller_phone': self.seller_phone,
            'commission_rate': self.commission_rate,
            'total_selling_price': self.total_selling_price,
            'approval_status': self.approval_status,
            'pending_changes': self.pending_changes,
            'original_product_id': self.original_product_id,
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
            quantity=bson_doc.get('quantity', 0),
            seller_trade_id=bson_doc.get('seller_trade_id'),
            seller_name=bson_doc.get('seller_name'),
            seller_email=bson_doc.get('seller_email'),
            seller_phone=bson_doc.get('seller_phone'),
            commission_rate=bson_doc.get('commission_rate'),
            total_selling_price=bson_doc.get('total_selling_price'),
            approval_status=bson_doc.get('approval_status'),
            pending_changes=bson_doc.get('pending_changes'),
            original_product_id=bson_doc.get('original_product_id'),
            registration_ip=bson_doc.get('registration_ip'),
            registration_user_agent=bson_doc.get('registration_user_agent'),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

    def __repr__(self):
        return f'<Product {self.product_name}>'


