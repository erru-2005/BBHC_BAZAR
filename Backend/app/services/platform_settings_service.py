"""
Platform-wide settings (service accept credit cost, etc.)
"""
from datetime import datetime, timezone

from app import mongo

SERVICE_ACCEPT_CREDIT_DOC_ID = 'service_accept_credit'
DEFAULT_SERVICE_ACCEPT_CREDIT = 25


class PlatformSettingsService:
    @staticmethod
    def _global_service_accept_credit():
        try:
            doc = mongo.db.system_settings.find_one({'_id': SERVICE_ACCEPT_CREDIT_DOC_ID})
            if doc and doc.get('credit_count') is not None:
                return max(0, int(doc['credit_count']))
        except Exception:
            pass
        return DEFAULT_SERVICE_ACCEPT_CREDIT

    @staticmethod
    def get_service_accept_credit_cost(category=None):
        """Credits charged when a seller accepts a service order."""
        if category:
            category = str(category).strip()
            if category:
                try:
                    doc = mongo.db.service_category_accept_credits.find_one({'category': category})
                    if doc and doc.get('credit_count') is not None:
                        return max(0, int(doc['credit_count']))
                except Exception:
                    pass
        return PlatformSettingsService._global_service_accept_credit()

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

    @staticmethod
    def get_all_service_category_accept_credits():
        try:
            docs = mongo.db.service_category_accept_credits.find()
            return {doc['category']: max(0, int(doc.get('credit_count', 0))) for doc in docs}
        except Exception:
            return {}

    @staticmethod
    def set_service_category_accept_credit(category, credit_count):
        category = str(category).strip()
        if not category:
            raise ValueError('Category name is required')
        credit_count = int(credit_count)
        if credit_count < 0:
            raise ValueError('Credit count must be 0 or greater')
        mongo.db.service_category_accept_credits.update_one(
            {'category': category},
            {
                '$set': {
                    'category': category,
                    'credit_count': credit_count,
                    'updated_at': datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
        return credit_count

    @staticmethod
    def bulk_set_service_category_accept_credits(category_credits):
        if not isinstance(category_credits, dict):
            raise ValueError('category_credits must be an object')
        saved = {}
        for category, credit_count in category_credits.items():
            saved[category] = PlatformSettingsService.set_service_category_accept_credit(
                category, credit_count
            )
        return saved

    @staticmethod
    def resolve_service_accept_credit_from_order(order):
        """Resolve accept credit from order snapshot or linked service."""
        snapshot = getattr(order, 'product_snapshot', None) or {}
        if isinstance(snapshot, dict):
            categories = snapshot.get('categories') or []
            if categories:
                return PlatformSettingsService.get_service_accept_credit_cost(categories[0])

        product_id = getattr(order, 'product_id', None)
        if product_id:
            try:
                from app.models.service import Service

                service_doc = mongo.db.services.find_one({'_id': product_id})
                if service_doc:
                    service = Service.from_bson(service_doc)
                    categories = service.categories or []
                    if categories:
                        return PlatformSettingsService.get_service_accept_credit_cost(categories[0])
            except Exception:
                pass

        return PlatformSettingsService.get_service_accept_credit_cost()
