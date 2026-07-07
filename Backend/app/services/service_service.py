"""
Service service - handles service persistence and queries
"""
from bson import ObjectId
from datetime import datetime, timezone

from app import mongo
from app.models.service import Service
from app.utils.image_handler import save_stored_image_reference, delete_entity_images, is_base64_image


class ServiceService:
    """Business logic for service creation and retrieval"""

    @staticmethod
    def create_service(service_data):
        try:
            required_fields = ['service_name', 'description', 'points', 'thumbnail', 'service_charge', 'seller_trade_id']
            for field in required_fields:
                if field not in service_data or service_data[field] in (None, '', []):
                    raise ValueError(f"Missing required field: {field}")

            points = service_data.get('points')
            if not isinstance(points, list) or not points:
                raise ValueError("Points must be a non-empty list")

            normalized_points = [str(point).strip() for point in points if str(point).strip()]
            if not normalized_points:
                raise ValueError("At least one bullet point is required")

            # Validate charge
            service_charge = float(service_data.get('service_charge'))
            if service_charge <= 0:
                raise ValueError("Service charge must be greater than zero")

            categories = service_data.get('categories', [])
            if categories and not isinstance(categories, list):
                raise ValueError("Categories must be a list")
            normalized_categories = [str(cat).strip() for cat in categories if str(cat).strip()]

            commission_rate = service_data.get('commission_rate')
            if commission_rate is not None:
                commission_rate = float(commission_rate)
            
            total_service_charge = None
            if commission_rate is not None and commission_rate >= 0:
                total_service_charge = ServiceService.calculate_total_service_charge(
                    service_charge, commission_rate
                )
            else:
                total_service_charge = service_charge

            # Determine approval status
            approval_status = service_data.get('approval_status')
            if approval_status is None:
                if service_data.get('created_by_user_type') == 'seller':
                    approval_status = 'pending'
                else:
                    approval_status = 'approved'

            service_id = ObjectId(service_data['service_id']) if service_data.get('service_id') else ObjectId()

            thumbnail_url = save_stored_image_reference(
                service_data['thumbnail'], str(service_id), 0, 'services'
            )
            if not thumbnail_url:
                raise ValueError('Service thumbnail is required. Upload an image first.')

            gallery_urls = []
            if 'gallery' in service_data and isinstance(service_data['gallery'], list):
                for i, img_ref in enumerate(service_data['gallery']):
                    if is_base64_image(img_ref):
                        raise ValueError('Base64 gallery images are not supported.')
                    if img_ref and str(img_ref).startswith('/static/'):
                        gallery_urls.append(str(img_ref))

            service = Service(
                service_name=service_data['service_name'],
                description=service_data['description'],
                points=normalized_points,
                thumbnail=thumbnail_url,
                service_charge=service_charge,
                gallery=gallery_urls,
                categories=normalized_categories,
                created_by=service_data.get('created_by', 'system'),
                created_by_user_id=service_data.get('created_by_user_id'),
                created_by_user_type=service_data.get('created_by_user_type'),
                availability=True,
                requires_booking_date=service_data.get('requires_booking_date', False),
                seller_trade_id=service_data.get('seller_trade_id'),
                seller_name=service_data.get('seller_name'),
                seller_email=service_data.get('seller_email'),
                seller_phone=service_data.get('seller_phone'),
                commission_rate=commission_rate,
                total_service_charge=total_service_charge,
                approval_status=approval_status,
                pending_changes=service_data.get('pending_changes'),
                original_service_id=service_data.get('original_service_id'),
                created_at=service_data.get('created_at') or datetime.now(timezone.utc),
                updated_at=service_data.get('updated_at') or datetime.now(timezone.utc),
                registration_ip=service_data.get('registration_ip'),
                registration_user_agent=service_data.get('registration_user_agent')
            )
            service._id = service_id

            service_bson = service.to_bson()
            mongo.db.services.insert_one(service_bson)
            return service
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating service: {str(e)}")

    @staticmethod
    def get_service_by_id(service_id):
        try:
            service_doc = mongo.db.services.find_one({'_id': ObjectId(service_id)})
            if not service_doc:
                return None
            service = Service.from_bson(service_doc)
            if service:
                ServiceService.populate_delivery_charge(service)
            return service
        except Exception:
            return None

    @staticmethod
    def get_all_services(skip=0, limit=100, include_pending=False):
        try:
            query = {}
            if not include_pending:
                query = {
                    '$or': [
                        {'approval_status': 'approved'},
                        {'approval_status': {'$exists': False}}
                    ]
                }
            
            services_cursor = (
                mongo.db.services.find(query)
                .sort('created_at', -1)
                .skip(skip)
                .limit(limit)
            )
            
            services = []
            for doc in services_cursor:
                service = Service.from_bson(doc)
                if service:
                    ServiceService.populate_delivery_charge(service)
                services.append(service)
            return services
        except Exception:
            return []

    @staticmethod
    def update_service(service_id, service_data):
        try:
            update_fields = {}

            allowed_fields = [
                'service_name', 'description', 'thumbnail', 'service_charge', 
                'requires_booking_date', 'seller_trade_id', 'seller_name', 
                'seller_email', 'seller_phone', 'commission_rate'
            ]
            
            for field in allowed_fields:
                if field == 'requires_booking_date':
                    if field in service_data:
                        update_fields[field] = bool(service_data[field])
                    continue
                if field in service_data and service_data[field] not in (None, ''):
                    if field in ['service_charge', 'commission_rate']:
                        update_fields[field] = float(service_data[field])
                    else:
                        update_fields[field] = service_data[field]
            
            if 'commission_rate' in update_fields or 'service_charge' in update_fields:
                service_charge = update_fields.get('service_charge')
                commission_rate = update_fields.get('commission_rate')
                
                if service_charge is None:
                    service = ServiceService.get_service_by_id(service_id)
                    if service:
                        service_charge = service.service_charge
                
                if commission_rate is None:
                    service = service or ServiceService.get_service_by_id(service_id)
                    if service:
                        commission_rate = service.commission_rate or 0
                
                if service_charge and service_charge > 0:
                    update_fields['total_service_charge'] = ServiceService.calculate_total_service_charge(
                        service_charge, commission_rate or 0
                    )

            if 'points' in service_data:
                points = service_data['points']
                if not isinstance(points, list) or not points:
                    raise ValueError("Points must be a non-empty list")
                update_fields['points'] = [str(point).strip() for point in points if str(point).strip()]

            if 'categories' in service_data:
                categories = service_data['categories'] or []
                update_fields['categories'] = [str(cat).strip() for cat in categories if str(cat).strip()]

            if 'thumbnail' in service_data:
                update_fields['thumbnail'] = save_stored_image_reference(
                    service_data['thumbnail'], str(service_id), 0, 'services'
                )

            if 'gallery' in service_data:
                gallery_urls = []
                if isinstance(service_data['gallery'], list):
                    for i, img_ref in enumerate(service_data['gallery']):
                        url = save_stored_image_reference(
                            img_ref, str(service_id), i + 1, 'services'
                        )
                        if url:
                            gallery_urls.append(url)
                update_fields['gallery'] = gallery_urls

            if not update_fields:
                raise ValueError("No data provided to update")

            update_fields['updated_at'] = datetime.now(timezone.utc)

            result = mongo.db.services.update_one(
                {'_id': ObjectId(service_id)},
                {'$set': update_fields}
            )

            if result.matched_count == 0:
                return None

            return ServiceService.get_service_by_id(service_id)
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error updating service: {str(e)}")

    @staticmethod
    def delete_service(service_id):
        try:
            result = mongo.db.services.delete_one({'_id': ObjectId(service_id)})
            if result.deleted_count > 0:
                delete_entity_images(service_id, 'services')
                return True
            return False
        except Exception as e:
            raise Exception(f"Error deleting service: {str(e)}")

    @staticmethod
    def calculate_total_service_charge(service_charge, commission_rate):
        if not service_charge or service_charge <= 0:
            return None
        if not commission_rate or commission_rate < 0:
            return service_charge
        commission_amount = (service_charge * commission_rate) / 100
        return round(service_charge + commission_amount, 2)

    @staticmethod
    def set_category_commission_rate(category, commission_rate):
        try:
            mongo.db.service_category_commissions.update_one(
                {'category': category},
                {
                    '$set': {
                        'category': category,
                        'commission_rate': float(commission_rate),
                        'updated_at': datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
            return True
        except Exception as e:
            raise Exception(f'Error setting service category commission: {str(e)}')

    @staticmethod
    def get_category_commission_rate(category):
        try:
            doc = mongo.db.service_category_commissions.find_one({'category': category})
            if doc:
                return doc.get('commission_rate')
            return None
        except Exception:
            return None

    @staticmethod
    def get_all_category_commissions():
        try:
            docs = mongo.db.service_category_commissions.find()
            return {doc['category']: doc.get('commission_rate') for doc in docs}
        except Exception:
            return {}

    @staticmethod
    def apply_commission_to_service(service_id, commission_rate):
        try:
            service = ServiceService.get_service_by_id(service_id)
            if not service:
                return None
            service_charge = service.service_charge
            if not service_charge or service_charge <= 0:
                raise ValueError('Service charge must be greater than zero')
            total_service_charge = ServiceService.calculate_total_service_charge(
                service_charge, commission_rate
            )
            mongo.db.services.update_one(
                {'_id': ObjectId(service_id)},
                {
                    '$set': {
                        'commission_rate': float(commission_rate),
                        'total_service_charge': total_service_charge,
                        'updated_at': datetime.now(timezone.utc),
                    }
                },
            )
            return ServiceService.get_service_by_id(service_id)
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f'Error applying service commission: {str(e)}')

    @staticmethod
    def apply_commission_by_category(category, commission_rate):
        try:
            ServiceService.set_category_commission_rate(category, commission_rate)
            services = mongo.db.services.find({'categories': category})
            updated_count = 0
            for service_doc in services:
                service_charge = service_doc.get('service_charge')
                if service_charge and service_charge > 0 and not service_doc.get('commission_rate'):
                    total_service_charge = ServiceService.calculate_total_service_charge(
                        service_charge, commission_rate
                    )
                    mongo.db.services.update_one(
                        {'_id': service_doc['_id']},
                        {
                            '$set': {
                                'commission_rate': float(commission_rate),
                                'total_service_charge': total_service_charge,
                                'updated_at': datetime.now(timezone.utc),
                            }
                        },
                    )
                    updated_count += 1
            return updated_count
        except Exception as e:
            raise Exception(f'Error applying service commission by category: {str(e)}')

    @staticmethod
    def apply_commission_to_all(commission_rate):
        try:
            category_commissions = ServiceService.get_all_category_commissions()
            services = mongo.db.services.find({'service_charge': {'$gt': 0}})
            updated_count = 0
            for service_doc in services:
                service_charge = service_doc.get('service_charge')
                if not service_charge or service_charge <= 0:
                    continue
                if service_doc.get('commission_rate'):
                    continue
                categories = service_doc.get('categories') or []
                has_category_commission = any(cat in category_commissions for cat in categories)
                if has_category_commission:
                    continue
                total_service_charge = ServiceService.calculate_total_service_charge(
                    service_charge, commission_rate
                )
                mongo.db.services.update_one(
                    {'_id': service_doc['_id']},
                    {
                        '$set': {
                            'commission_rate': float(commission_rate),
                            'total_service_charge': total_service_charge,
                            'updated_at': datetime.now(timezone.utc),
                        }
                    },
                )
                updated_count += 1
            return updated_count
        except Exception as e:
            raise Exception(f'Error applying commission to all services: {str(e)}')

    @staticmethod
    def get_pending_services():
        try:
            services_cursor = mongo.db.services.find({
                'approval_status': 'pending'
            }).sort('created_at', -1)
            services = []
            for doc in services_cursor:
                service = Service.from_bson(doc)
                if service:
                    ServiceService.populate_delivery_charge(service)
                services.append(service)
            return services
        except Exception:
            return []

    @staticmethod
    def accept_service(service_id):
        try:
            service = ServiceService.get_service_by_id(service_id)
            if not service:
                return None, "Service not found"
            
            if service.approval_status != 'pending':
                return None, "Service is not pending approval"
            
            result = mongo.db.services.update_one(
                {'_id': ObjectId(service_id)},
                {
                    '$set': {
                        'approval_status': 'approved',
                        'updated_at': datetime.now(timezone.utc)
                    }
                }
            )
            if result.matched_count == 0:
                return None, "Service not found"
            return ServiceService.get_service_by_id(service_id), None
        except Exception as e:
            return None, f"Error accepting service: {str(e)}"

    @staticmethod
    def reject_service(service_id, move_to_bin=True, reason=None):
        try:
            service = ServiceService.get_service_by_id(service_id)
            if not service:
                return False, "Service not found"
            
            if service.approval_status != 'pending':
                return False, "Service is not pending approval"
            
            if move_to_bin:
                service_bson = service.to_bson()
                service_bson['approval_status'] = 'rejected'
                service_bson['rejected_at'] = datetime.now(timezone.utc)
                service_bson['rejection_reason'] = reason
                mongo.db.service_bin.insert_one(service_bson)
            
            result = mongo.db.services.delete_one({'_id': ObjectId(service_id)})
            return result.deleted_count > 0, None
        except Exception as e:
            return False, f"Error rejecting service: {str(e)}"

    @staticmethod
    def populate_delivery_charge(service):
        """Populate active delivery charge based on priority hierarchy"""
        try:
            if service.delivery_charge is not None:
                return service.delivery_charge

            # Check category delivery rates
            if service.categories:
                for category in service.categories:
                    doc = mongo.db.service_category_delivery_rates.find_one({'category': category})
                    if doc:
                        service.delivery_charge = float(doc.get('rate', 0))
                        return service.delivery_charge

            # Check global delivery rate
            global_doc = mongo.db.delivery_settings.find_one({'key': 'global_service_rate'})
            if global_doc:
                service.delivery_charge = float(global_doc.get('rate', 0))
            else:
                service.delivery_charge = 0.0
            return service.delivery_charge
        except Exception:
            service.delivery_charge = 0.0
            return 0.0
