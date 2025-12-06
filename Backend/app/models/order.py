"""
Order model for MongoDB persistence
"""
from datetime import datetime
from bson import ObjectId


class Order:
    """Represents a customer order stored in MongoDB."""

    def __init__(
        self,
        order_number,
        product_id,
        user_id,
        quantity,
        unit_price,
        total_amount,
        product_snapshot=None,
        user_snapshot=None,
        seller_id=None,
        seller_snapshot=None,
        status='pending_seller',
        pickup_location=None,
        pickup_instructions=None,
        delivery_address=None,
        qr_code_data=None,
        secure_token_user=None,
        secure_token_seller=None,
        token_used_user=False,
        token_used_seller=False,
        qr_code_url_user=None,
        qr_code_url_seller=None,
        outlet_id=None,
        status_history=None,
        cancelled_by_master=False,
        cancellation_code=None,
        rejection_reason=None,
        rejected_by=None,
        metadata=None,
        created_at=None,
        updated_at=None,
        _id=None
    ):
        self._id = _id or ObjectId()
        self.order_number = order_number
        self.product_id = product_id if isinstance(product_id, ObjectId) else ObjectId(product_id)
        self.user_id = user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)
        self.seller_id = None
        if seller_id:
            self.seller_id = seller_id if isinstance(seller_id, ObjectId) else ObjectId(seller_id)

        self.quantity = quantity
        self.unit_price = unit_price
        self.total_amount = total_amount
        self.status = status
        self.product_snapshot = product_snapshot or {}
        self.user_snapshot = user_snapshot or {}
        self.seller_snapshot = seller_snapshot or {}
        self.pickup_location = pickup_location
        self.pickup_instructions = pickup_instructions
        self.delivery_address = delivery_address
        self.qr_code_data = qr_code_data
        self.secure_token_user = secure_token_user
        self.secure_token_seller = secure_token_seller
        self.token_used_user = token_used_user
        self.token_used_seller = token_used_seller
        self.qr_code_url_user = qr_code_url_user
        self.qr_code_url_seller = qr_code_url_seller
        self.outlet_id = outlet_id
        self.status_history = status_history or []
        self.cancelled_by_master = cancelled_by_master
        self.cancellation_code = cancellation_code
        self.rejection_reason = rejection_reason
        self.rejected_by = rejected_by
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        """Return a JSON-serializable representation."""
        return {
            'id': str(self._id),
            'orderNumber': self.order_number,
            'product_id': str(self.product_id),
            'user_id': str(self.user_id),
            'seller_id': str(self.seller_id) if self.seller_id else None,
            'outlet_id': str(self.outlet_id) if self.outlet_id else None,
            'quantity': self.quantity,
            'unitPrice': self.unit_price,
            'totalAmount': self.total_amount,
            'status': self.status,
            'pickupLocation': self.pickup_location,
            'pickupInstructions': self.pickup_instructions,
            'deliveryAddress': self.delivery_address,
            'qrCodeData': self.qr_code_data,
            'secureTokenUser': self.secure_token_user,
            'secureTokenSeller': self.secure_token_seller,
            'tokenUsedUser': self.token_used_user,
            'tokenUsedSeller': self.token_used_seller,
            'qrCodeUrlUser': self.qr_code_url_user,
            'qrCodeUrlSeller': self.qr_code_url_seller,
            'statusHistory': [self._format_status_entry(entry) for entry in self.status_history],
            'cancelledByMaster': self.cancelled_by_master,
            'cancellationCode': self.cancellation_code,
            'rejectionReason': self.rejection_reason,
            'rejectedBy': self.rejected_by,
            'product': self.product_snapshot,
            'user': self.user_snapshot,
            'seller': self.seller_snapshot,
            'metadata': self.metadata,
            'createdAt': self._format_datetime(self.created_at),
            'updatedAt': self._format_datetime(self.updated_at)
        }

    def to_bson(self):
        """Return Mongo-ready document."""
        return {
            '_id': self._id,
            'order_number': self.order_number,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'seller_id': self.seller_id,
            'outlet_id': self.outlet_id,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_amount': self.total_amount,
            'status': self.status,
            'pickup_location': self.pickup_location,
            'pickup_instructions': self.pickup_instructions,
            'delivery_address': self.delivery_address,
            'qr_code_data': self.qr_code_data,
            'secure_token_user': self.secure_token_user,
            'secure_token_seller': self.secure_token_seller,
            'token_used_user': self.token_used_user,
            'token_used_seller': self.token_used_seller,
            'qr_code_url_user': self.qr_code_url_user,
            'qr_code_url_seller': self.qr_code_url_seller,
            'status_history': self.status_history,
            'cancelled_by_master': self.cancelled_by_master,
            'cancellation_code': self.cancellation_code,
            'rejection_reason': self.rejection_reason,
            'rejected_by': self.rejected_by,
            'product_snapshot': self.product_snapshot,
            'user_snapshot': self.user_snapshot,
            'seller_snapshot': self.seller_snapshot,
            'metadata': self.metadata,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            order_number=bson_doc.get('order_number'),
            product_id=bson_doc.get('product_id'),
            user_id=bson_doc.get('user_id'),
            seller_id=bson_doc.get('seller_id'),
            outlet_id=bson_doc.get('outlet_id'),
            quantity=bson_doc.get('quantity'),
            unit_price=bson_doc.get('unit_price'),
            total_amount=bson_doc.get('total_amount'),
            status=bson_doc.get('status', 'pending_seller'),
            pickup_location=bson_doc.get('pickup_location'),
            pickup_instructions=bson_doc.get('pickup_instructions'),
            delivery_address=bson_doc.get('delivery_address'),
            qr_code_data=bson_doc.get('qr_code_data'),
            secure_token_user=bson_doc.get('secure_token_user'),
            secure_token_seller=bson_doc.get('secure_token_seller'),
            token_used_user=bson_doc.get('token_used_user', False),
            token_used_seller=bson_doc.get('token_used_seller', False),
            qr_code_url_user=bson_doc.get('qr_code_url_user'),
            qr_code_url_seller=bson_doc.get('qr_code_url_seller'),
            status_history=bson_doc.get('status_history', []),
            cancelled_by_master=bson_doc.get('cancelled_by_master', False),
            cancellation_code=bson_doc.get('cancellation_code'),
            rejection_reason=bson_doc.get('rejection_reason'),
            rejected_by=bson_doc.get('rejected_by'),
            product_snapshot=bson_doc.get('product_snapshot', {}),
            user_snapshot=bson_doc.get('user_snapshot', {}),
            seller_snapshot=bson_doc.get('seller_snapshot', {}),
            metadata=bson_doc.get('metadata', {}),
            created_at=bson_doc.get('created_at'),
            updated_at=bson_doc.get('updated_at')
        )

    @staticmethod
    def _format_datetime(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    @staticmethod
    def _format_status_entry(entry):
        if isinstance(entry, dict):
            if 'timestamp' in entry and isinstance(entry['timestamp'], datetime):
                entry = entry.copy()
                entry['timestamp'] = entry['timestamp'].isoformat()
        return entry
