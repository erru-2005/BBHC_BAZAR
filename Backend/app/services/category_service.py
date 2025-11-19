"""
Category service - business logic for product categories
"""
from app import mongo
from app.models.category import Category


class CategoryService:
    """Service for CRUD operations on categories"""

    @staticmethod
    def get_all_categories():
        try:
            docs = mongo.db.categories.find().sort('name', 1)
            return [Category.from_bson(doc) for doc in docs]
        except Exception:
            return []

    @staticmethod
    def create_category(name, created_by='system'):
        try:
            name = name.strip()
            if not name:
                raise ValueError("Category name is required")

            existing = mongo.db.categories.find_one({'name': {'$regex': f'^{name}$', '$options': 'i'}})
            if existing:
                raise ValueError("Category with this name already exists")

            category = Category(name=name, created_by=created_by)
            mongo.db.categories.insert_one(category.to_bson())
            return category
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating category: {str(e)}")

