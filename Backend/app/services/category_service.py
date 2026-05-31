"""
Category service - business logic for product and service categories
"""
from app import mongo
from app.models.category import Category


class CategoryService:
    """Service for CRUD operations on categories"""

    @staticmethod
    def _normalize_type(category_type):
        category_type = (category_type or 'product').strip().lower()
        if category_type not in Category.VALID_TYPES:
            raise ValueError("category_type must be 'product' or 'service'")
        return category_type

    @staticmethod
    def get_all_categories(category_type='product'):
        try:
            category_type = CategoryService._normalize_type(category_type)
            query = {'category_type': category_type}
            docs = mongo.db.categories.find(query).sort('name', 1)
            return [Category.from_bson(doc) for doc in docs]
        except ValueError:
            raise
        except Exception:
            return []

    @staticmethod
    def create_category(name, created_by='system', category_type='product'):
        try:
            name = name.strip()
            if not name:
                raise ValueError("Category name is required")

            category_type = CategoryService._normalize_type(category_type)

            existing = mongo.db.categories.find_one({
                'name': {'$regex': f'^{name}$', '$options': 'i'},
                'category_type': category_type,
            })
            if existing:
                raise ValueError("Category with this name already exists for this type")

            category = Category(name=name, created_by=created_by, category_type=category_type)
            mongo.db.categories.insert_one(category.to_bson())
            return category
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating category: {str(e)}")
