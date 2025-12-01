"""
Bag service - handles bag persistence and queries
"""
from bson import ObjectId
from datetime import datetime

from app.models.bag import Bag
from app import mongo


class BagService:
    """Service for managing shopping bag items"""

    @staticmethod
    def add_to_bag(user_id, product_id, quantity=1, selected_size=None, selected_color=None):
        """Add or update item in bag"""
        try:
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
            product_id_obj = ObjectId(product_id) if not isinstance(product_id, ObjectId) else product_id

            # Check if item already exists in bag
            existing = mongo.db.bag.find_one({
                'user_id': user_id_obj,
                'product_id': product_id_obj,
                'selected_size': selected_size,
                'selected_color': selected_color
            })

            if existing:
                # Update quantity
                new_quantity = existing.get('quantity', 0) + quantity
                mongo.db.bag.update_one(
                    {'_id': existing['_id']},
                    {
                        '$set': {
                            'quantity': new_quantity,
                            'updated_at': datetime.utcnow()
                        }
                    }
                )
                updated_doc = mongo.db.bag.find_one({'_id': existing['_id']})
                return Bag.from_bson(updated_doc)
            else:
                # Create new bag item
                bag_item = Bag(
                    user_id=user_id_obj,
                    product_id=product_id_obj,
                    quantity=quantity,
                    selected_size=selected_size,
                    selected_color=selected_color
                )
                bag_bson = bag_item.to_bson()
                result = mongo.db.bag.insert_one(bag_bson)
                bag_item._id = result.inserted_id
                return bag_item
        except Exception as e:
            raise Exception(f"Error adding to bag: {str(e)}")

    @staticmethod
    def get_user_bag(user_id):
        """Get all items in user's bag"""
        try:
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
            bag_items = mongo.db.bag.find({'user_id': user_id_obj}).sort('created_at', -1)
            return [Bag.from_bson(item) for item in bag_items if item]
        except Exception as e:
            raise Exception(f"Error getting bag: {str(e)}")

    @staticmethod
    def update_bag_item(bag_item_id, user_id, quantity=None, selected_size=None, selected_color=None):
        """Update bag item"""
        try:
            bag_id_obj = ObjectId(bag_item_id) if not isinstance(bag_item_id, ObjectId) else bag_item_id
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

            # Verify ownership
            existing = mongo.db.bag.find_one({
                '_id': bag_id_obj,
                'user_id': user_id_obj
            })

            if not existing:
                return None

            update_data = {'updated_at': datetime.utcnow()}
            if quantity is not None:
                if quantity <= 0:
                    # Remove item if quantity is 0 or less
                    mongo.db.bag.delete_one({'_id': bag_id_obj})
                    return None
                update_data['quantity'] = quantity
            if selected_size is not None:
                update_data['selected_size'] = selected_size
            if selected_color is not None:
                update_data['selected_color'] = selected_color

            mongo.db.bag.update_one(
                {'_id': bag_id_obj},
                {'$set': update_data}
            )

            updated_doc = mongo.db.bag.find_one({'_id': bag_id_obj})
            return Bag.from_bson(updated_doc)
        except Exception as e:
            raise Exception(f"Error updating bag item: {str(e)}")

    @staticmethod
    def remove_from_bag(bag_item_id, user_id):
        """Remove item from bag"""
        try:
            bag_id_obj = ObjectId(bag_item_id) if not isinstance(bag_item_id, ObjectId) else bag_item_id
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

            result = mongo.db.bag.delete_one({
                '_id': bag_id_obj,
                'user_id': user_id_obj
            })

            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error removing from bag: {str(e)}")

    @staticmethod
    def clear_user_bag(user_id):
        """Clear all items from user's bag"""
        try:
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
            result = mongo.db.bag.delete_many({'user_id': user_id_obj})
            return result.deleted_count
        except Exception as e:
            raise Exception(f"Error clearing bag: {str(e)}")

    @staticmethod
    def get_bag_item_by_id(bag_item_id, user_id):
        """Get a specific bag item"""
        try:
            bag_id_obj = ObjectId(bag_item_id) if not isinstance(bag_item_id, ObjectId) else bag_item_id
            user_id_obj = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

            bag_doc = mongo.db.bag.find_one({
                '_id': bag_id_obj,
                'user_id': user_id_obj
            })

            return Bag.from_bson(bag_doc)
        except Exception:
            return None

