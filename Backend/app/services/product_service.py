"""
Product service - handles product persistence and queries
"""
from bson import ObjectId
from datetime import datetime

from app import mongo
from app.models.product import Product


class ProductService:
    """Business logic for product creation and retrieval"""

    @staticmethod
    def create_product(product_data):
        try:
            required_fields = ['product_name', 'specification', 'points', 'thumbnail', 'selling_price', 'max_price']
            for field in required_fields:
                if field not in product_data or product_data[field] in (None, '', []):
                    raise ValueError(f"Missing required field: {field}")

            points = product_data.get('points')
            if not isinstance(points, list) or not points:
                raise ValueError("Points must be a non-empty list")

            normalized_points = [str(point).strip() for point in points if str(point).strip()]
            if not normalized_points:
                raise ValueError("At least one bullet point is required")

            # Validate pricing
            selling_price = float(product_data.get('selling_price'))
            max_price = float(product_data.get('max_price'))
            if selling_price <= 0 or max_price <= 0:
                raise ValueError("Price values must be greater than zero")
            if max_price < selling_price:
                raise ValueError("Max price (MRP) must be greater than or equal to selling price")

            categories = product_data.get('categories', [])
            if categories and not isinstance(categories, list):
                raise ValueError("Categories must be a list")
            normalized_categories = [str(cat).strip() for cat in categories if str(cat).strip()]

            product = Product(
                product_name=product_data['product_name'],
                specification=product_data['specification'],
                points=normalized_points,
                thumbnail=product_data['thumbnail'],
                selling_price=selling_price,
                max_price=max_price,
                gallery=product_data.get('gallery', []),
                categories=normalized_categories,
                created_by=product_data.get('created_by', 'system'),
                created_by_user_id=product_data.get('created_by_user_id'),
                created_by_user_type=product_data.get('created_by_user_type'),
                created_at=product_data.get('created_at') or datetime.utcnow(),
                updated_at=product_data.get('updated_at') or datetime.utcnow(),
                registration_ip=product_data.get('registration_ip'),
                registration_user_agent=product_data.get('registration_user_agent')
            )

            product_bson = product.to_bson()
            result = mongo.db.products.insert_one(product_bson)
            product._id = result.inserted_id
            return product
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating product: {str(e)}")

    @staticmethod
    def get_product_by_id(product_id):
        try:
            product_doc = mongo.db.products.find_one({'_id': ObjectId(product_id)})
            return Product.from_bson(product_doc)
        except Exception:
            return None

    @staticmethod
    def get_all_products(skip=0, limit=100):
        try:
            products_cursor = (
                mongo.db.products.find()
                .sort('created_at', -1)
                .skip(skip)
                .limit(limit)
            )
            return [Product.from_bson(product_doc) for product_doc in products_cursor]
        except Exception:
            return []

    @staticmethod
    def update_product(product_id, product_data):
        try:
            update_fields = {}

            for field in ['product_name', 'specification', 'thumbnail', 'selling_price', 'max_price']:
                if field in product_data and product_data[field] not in (None, ''):
                    update_fields[field] = product_data[field] if field not in ['selling_price', 'max_price'] else float(product_data[field])

            if 'points' in product_data:
                points = product_data['points']
                if not isinstance(points, list) or not points:
                    raise ValueError("Points must be a non-empty list")
                normalized_points = [str(point).strip() for point in points if str(point).strip()]
                if not normalized_points:
                    raise ValueError("At least one bullet point is required")
                update_fields['points'] = normalized_points

            if 'categories' in product_data:
                categories = product_data['categories'] or []
                if categories and not isinstance(categories, list):
                    raise ValueError("Categories must be a list")
                update_fields['categories'] = [str(cat).strip() for cat in categories if str(cat).strip()]

            if 'gallery' in product_data:
                update_fields['gallery'] = product_data['gallery']

            if not update_fields:
                raise ValueError("No data provided to update")

            update_fields['updated_at'] = datetime.utcnow()

            result = mongo.db.products.update_one(
                {'_id': ObjectId(product_id)},
                {'$set': update_fields}
            )

            if result.matched_count == 0:
                return None

            return ProductService.get_product_by_id(product_id)
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error updating product: {str(e)}")

    @staticmethod
    def delete_product(product_id):
        try:
            result = mongo.db.products.delete_one({'_id': ObjectId(product_id)})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error deleting product: {str(e)}")

