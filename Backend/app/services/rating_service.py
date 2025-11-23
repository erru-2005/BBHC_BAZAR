"""
Rating service - handles rating persistence and queries
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.rating import Rating


class RatingService:
    """Business logic for rating creation and retrieval"""

    @staticmethod
    def create_or_update_rating(rating_data):
        """Create a new rating or update existing one"""
        try:
            # Validate required fields
            required_fields = ['product_id', 'user_id', 'rating']
            for field in required_fields:
                if field not in rating_data or rating_data[field] is None:
                    raise ValueError(f"Missing required field: {field}")

            # Validate rating value (1-5)
            rating_value = int(rating_data['rating'])
            if rating_value < 1 or rating_value > 5:
                raise ValueError("Rating must be between 1 and 5")

            product_id = ObjectId(rating_data['product_id'])
            user_id = ObjectId(rating_data['user_id'])

            # Check if rating already exists
            existing_rating = mongo.db.ratings.find_one({
                'product_id': product_id,
                'user_id': user_id
            })

            # Handle seller_id - only convert to ObjectId if it's a valid ObjectId string
            seller_id = None
            if 'seller_id' in rating_data and rating_data['seller_id']:
                try:
                    # Try to convert to ObjectId if it's a valid ObjectId string
                    seller_id = ObjectId(rating_data['seller_id'])
                except Exception:
                    # If not a valid ObjectId, skip seller_id (it might be a trade_id or invalid)
                    seller_id = None

            if existing_rating:
                # Update existing rating
                update_data = {
                    'rating': rating_value,
                    'updated_at': datetime.utcnow()
                }
                if 'review_text' in rating_data:
                    update_data['review_text'] = rating_data['review_text']
                if seller_id:
                    update_data['seller_id'] = seller_id

                mongo.db.ratings.update_one(
                    {'_id': existing_rating['_id']},
                    {'$set': update_data}
                )
                updated_rating = mongo.db.ratings.find_one({'_id': existing_rating['_id']})
                return Rating.from_bson(updated_rating)
            else:
                # Create new rating
                rating = Rating(
                    product_id=product_id,
                    user_id=user_id,
                    seller_id=seller_id,
                    rating=rating_value,
                    review_text=rating_data.get('review_text')
                )

                result = mongo.db.ratings.insert_one(rating.to_bson())
                created_rating = mongo.db.ratings.find_one({'_id': result.inserted_id})
                return Rating.from_bson(created_rating)

        except ValueError as e:
            raise ValueError(str(e))
        except Exception as e:
            raise Exception(f"Error creating/updating rating: {str(e)}")

    @staticmethod
    def get_user_rating(product_id, user_id):
        """Get rating for a product by a specific user"""
        try:
            product_id = ObjectId(product_id)
            user_id = ObjectId(user_id)

            rating_doc = mongo.db.ratings.find_one({
                'product_id': product_id,
                'user_id': user_id
            })

            return Rating.from_bson(rating_doc) if rating_doc else None

        except Exception as e:
            raise Exception(f"Error fetching user rating: {str(e)}")

    @staticmethod
    def get_product_ratings(product_id, limit=None, skip=0):
        """Get all ratings for a product"""
        try:
            product_id = ObjectId(product_id)

            query = {'product_id': product_id}
            cursor = mongo.db.ratings.find(query).sort('created_at', -1)

            if skip:
                cursor = cursor.skip(skip)
            if limit:
                cursor = cursor.limit(limit)

            ratings = [Rating.from_bson(doc) for doc in cursor]
            return ratings

        except Exception as e:
            raise Exception(f"Error fetching product ratings: {str(e)}")

    @staticmethod
    def get_product_rating_stats(product_id):
        """Get rating statistics for a product"""
        try:
            product_id = ObjectId(product_id)

            # Aggregate ratings by star count
            pipeline = [
                {'$match': {'product_id': product_id}},
                {'$group': {
                    '_id': '$rating',
                    'count': {'$sum': 1}
                }},
                {'$sort': {'_id': -1}}
            ]

            star_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            total_ratings = 0
            total_score = 0

            for result in mongo.db.ratings.aggregate(pipeline):
                star = result['_id']
                count = result['count']
                if star in star_counts:
                    star_counts[star] = count
                    total_ratings += count
                    total_score += star * count

            average_rating = total_score / total_ratings if total_ratings > 0 else 0

            return {
                'total_ratings': total_ratings,
                'average_rating': round(average_rating, 2),
                'star_distribution': star_counts,
                'rating_categories': {
                    '1_star': star_counts[1],
                    '2_star': star_counts[2],
                    '3_star': star_counts[3],
                    '4_star': star_counts[4],
                    '5_star': star_counts[5]
                }
            }

        except Exception as e:
            raise Exception(f"Error fetching rating stats: {str(e)}")

    @staticmethod
    def get_products_by_rating_category(rating_category, limit=20, skip=0):
        """Get products categorized by rating (1_star, 2_star, etc.)"""
        try:
            # Validate rating category
            valid_categories = ['1_star', '2_star', '3_star', '4_star', '5_star']
            if rating_category not in valid_categories:
                raise ValueError(f"Invalid rating category. Must be one of: {valid_categories}")

            star_value = int(rating_category.split('_')[0])

            # Get product IDs with this rating
            pipeline = [
                {'$match': {'rating': star_value}},
                {'$group': {
                    '_id': '$product_id',
                    'count': {'$sum': 1}
                }},
                {'$sort': {'count': -1}},
                {'$skip': skip},
                {'$limit': limit}
            ]

            product_ids = [result['_id'] for result in mongo.db.ratings.aggregate(pipeline)]
            return product_ids

        except Exception as e:
            raise Exception(f"Error fetching products by rating: {str(e)}")

    @staticmethod
    def delete_rating(rating_id, user_id):
        """Delete a rating (only by the user who created it)"""
        try:
            rating_id = ObjectId(rating_id)
            user_id = ObjectId(user_id)

            rating_doc = mongo.db.ratings.find_one({'_id': rating_id})
            if not rating_doc:
                raise ValueError("Rating not found")

            if rating_doc['user_id'] != user_id:
                raise ValueError("You can only delete your own ratings")

            result = mongo.db.ratings.delete_one({'_id': rating_id})
            return result.deleted_count > 0

        except ValueError as e:
            raise ValueError(str(e))
        except Exception as e:
            raise Exception(f"Error deleting rating: {str(e)}")

