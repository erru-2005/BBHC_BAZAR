"""
Platform-wide settings (service accept credit cost, etc.)
"""
from datetime import datetime, timezone

from app import mongo

SERVICE_ACCEPT_CREDIT_DOC_ID = 'service_accept_credit'
DEFAULT_SERVICE_ACCEPT_CREDIT = 25


class PlatformSettingsService:
    @staticmethod
    def get_service_accept_credit_cost():
        try:
            doc = mongo.db.system_settings.find_one({'_id': SERVICE_ACCEPT_CREDIT_DOC_ID})
            if doc and doc.get('credit_count') is not None:
                return max(0, int(doc['credit_count']))
        except Exception:
            pass
        return DEFAULT_SERVICE_ACCEPT_CREDIT

    @staticmethod
    def set_service_accept_credit_cost(credit_count):
        credit_count = int(credit_count)
        if credit_count < 0:
            raise ValueError('Credit count must be 0 or greater')
        mongo.db.system_settings.update_one(
            {'_id': SERVICE_ACCEPT_CREDIT_DOC_ID},
            {
                '$set': {
                    'credit_count': credit_count,
                    'updated_at': datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
        return credit_count
