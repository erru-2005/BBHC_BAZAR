"""
Seller wallet transaction ledger (Razorpay recharges + master credit grants).
"""
from datetime import datetime, timezone

from app import mongo


class WalletTransactionService:
    COLLECTION = 'seller_wallet_transactions'

    @staticmethod
    def record_transaction(
        *,
        seller_id,
        seller_trade_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        master_id=None,
        master_username=None,
        razorpay_order_id=None,
        razorpay_payment_id=None,
        amount_inr_paise=None,
        notes=None,
        metadata=None,
        request=None,
    ):
        now = datetime.now(timezone.utc)
        doc = {
            'seller_id': str(seller_id),
            'seller_trade_id': seller_trade_id,
            'type': transaction_type,
            'amount': int(amount),
            'balance_before': int(balance_before),
            'balance_after': int(balance_after),
            'master_id': str(master_id) if master_id else None,
            'master_username': master_username,
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'amount_inr_paise': amount_inr_paise,
            'notes': notes,
            'metadata': metadata or {},
            'created_at': now,
            'created_at_iso': now.isoformat(),
        }
        if request:
            doc['ip_address'] = request.remote_addr
            doc['user_agent'] = request.headers.get('User-Agent')

        result = mongo.db[WalletTransactionService.COLLECTION].insert_one(doc)
        doc['id'] = str(result.inserted_id)
        return doc

    @staticmethod
    def get_stats_for_seller(seller_id):
        sid = str(seller_id)
        stats = {
            'total_transactions': 0,
            'master_grant_count': 0,
            'master_grant_credits': 0,
            'razorpay_count': 0,
            'razorpay_credits': 0,
            'total_inr_spent': 0,
        }
        pipeline = [
            {'$match': {'seller_id': sid}},
            {
                '$group': {
                    '_id': '$type',
                    'count': {'$sum': 1},
                    'credits': {'$sum': '$amount'},
                    'inr_paise': {'$sum': {'$ifNull': ['$amount_inr_paise', 0]}},
                }
            },
        ]
        inr_total_paise = 0
        for row in mongo.db[WalletTransactionService.COLLECTION].aggregate(pipeline):
            count = int(row.get('count', 0))
            credits = int(row.get('credits', 0))
            inr_total_paise += int(row.get('inr_paise', 0))
            stats['total_transactions'] += count
            if row['_id'] == 'master_grant':
                stats['master_grant_count'] = count
                stats['master_grant_credits'] = credits
            elif row['_id'] == 'razorpay_recharge':
                stats['razorpay_count'] = count
                stats['razorpay_credits'] = credits
        stats['total_inr_spent'] = round(inr_total_paise / 100, 2)
        return stats

    @staticmethod
    def list_for_seller(seller_id, skip=0, limit=50, types=None):
        query = {'seller_id': str(seller_id)}
        if types:
            query['type'] = {'$in': list(types)}
        cursor = (
            mongo.db[WalletTransactionService.COLLECTION]
            .find(query)
            .sort('created_at', -1)
            .skip(skip)
            .limit(limit)
        )
        items = []
        for doc in cursor:
            items.append(WalletTransactionService._serialize(doc))
        total = mongo.db[WalletTransactionService.COLLECTION].count_documents(query)
        return items, total

    @staticmethod
    def _serialize(doc):
        created = doc.get('created_at')
        if hasattr(created, 'isoformat'):
            created_iso = created.isoformat()
        else:
            created_iso = doc.get('created_at_iso')

        type_labels = {
            'master_grant': 'Master credit grant',
            'razorpay_recharge': 'Razorpay wallet recharge',
        }

        return {
            'id': str(doc['_id']),
            'seller_id': doc.get('seller_id'),
            'seller_trade_id': doc.get('seller_trade_id'),
            'type': doc.get('type'),
            'type_label': type_labels.get(doc.get('type'), doc.get('type')),
            'amount': doc.get('amount'),
            'balance_before': doc.get('balance_before'),
            'balance_after': doc.get('balance_after'),
            'master_id': doc.get('master_id'),
            'master_username': doc.get('master_username'),
            'razorpay_order_id': doc.get('razorpay_order_id'),
            'razorpay_payment_id': doc.get('razorpay_payment_id'),
            'amount_inr_paise': doc.get('amount_inr_paise'),
            'notes': doc.get('notes'),
            'metadata': doc.get('metadata', {}),
            'ip_address': doc.get('ip_address'),
            'created_at': created_iso,
        }
