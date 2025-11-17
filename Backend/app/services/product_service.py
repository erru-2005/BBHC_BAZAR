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
            required_fields = ['product_name', 'specification', 'points', 'thumbnail']
            for field in required_fields:
                if field not in product_data or product_data[field] in (None, '', []):
                    raise ValueError(f"Missing required field: {field}")

            points = product_data.get('points')
            if not isinstance(points, list) or not points:
                raise ValueError("Points must be a non-empty list")

            normalized_points = [str(point).strip() for point in points if str(point).strip()]
            if not normalized_points:
                raise ValueError("At least one bullet point is required")

            categories = product_data.get('categories', [])
            if categories and not isinstance(categories, list):
                raise ValueError("Categories must be a list")
            normalized_categories = [str(cat).strip() for cat in categories if str(cat).strip()]

            product = Product(
                product_name=product_data['product_name'],
                specification=product_data['specification'],
                points=normalized_points,
                thumbnail=product_data['thumbnail'],
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

