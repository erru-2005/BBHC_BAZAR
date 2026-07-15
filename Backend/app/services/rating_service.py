"""
Rating service - handles rating persistence and queries
"""
from bson import ObjectId
from datetime import datetime, timezone
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
                    seller_id = ObjectId(rating_data['seller_id'])
                except Exception:
                    seller_id = None

            # Determine item_type — check DB so we get it right at write time
            item_type = rating_data.get('item_type', 'product')
            if item_type not in ('product', 'service'):
                # Auto-detect: try product first, then service
                try:
                    from app.services.product_service import ProductService
                    from app.services.service_service import ServiceService
                    product = ProductService.get_product_by_id(str(product_id))
                    if product:
                        item_type = 'product'
                    else:
                        svc = ServiceService.get_service_by_id(str(product_id))
                        item_type = 'service' if svc else 'product'
                except Exception:
                    item_type = 'product'

            if existing_rating:
                # Check edit count
                current_edit_count = existing_rating.get('edit_count', 0)
                if current_edit_count >= 2:
                    raise ValueError("Maximum review edits (2) reached.")

                # Update existing rating
                update_data = {
                    'rating': rating_value,
                    'updated_at': datetime.now(timezone.utc),
                    'edit_count': current_edit_count + 1,
                    'item_type': item_type,
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
                    review_text=rating_data.get('review_text'),
                    item_type=item_type,
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

            enriched_ratings = []
            for r in ratings:
                r_dict = r.to_dict()
                # Direct DB lookup with projection for speed & reliability
                try:
                    user_doc = mongo.db.users.find_one(
                        {'_id': ObjectId(str(r.user_id))},
                        {'first_name': 1, 'last_name': 1, 'username': 1, 'phone_number': 1, 'image_url': 1}
                    )
                except Exception:
                    user_doc = None

                if user_doc:
                    first = (user_doc.get('first_name') or '').strip()
                    last = (user_doc.get('last_name') or '').strip()
                    full_name = f"{first} {last}".strip()
                    if not full_name:
                        username = user_doc.get('username') or ''
                        # Strip auto-generated "user_<phone>" prefix to show cleaner name
                        if username.startswith('user_'):
                            phone = user_doc.get('phone_number', '')
                            full_name = f"User {phone[-4:]}" if phone else 'User'
                        else:
                            full_name = username or 'User'
                    r_dict['user_name'] = full_name
                    r_dict['user_image'] = user_doc.get('image_url')
                else:
                    r_dict['user_name'] = 'User'
                    r_dict['user_image'] = None

                enriched_ratings.append(r_dict)
            return enriched_ratings

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
    def get_seller_rating_stats(seller_id):
        """Get rating statistics for a seller"""
        try:
            seller_id = ObjectId(seller_id)

            # Aggregate ratings by star count where seller_id matches
            pipeline = [
                {'$match': {'seller_id': seller_id}},
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
                'star_distribution': star_counts
            }

        except Exception as e:
            raise Exception(f"Error fetching seller rating stats: {str(e)}")

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

    @staticmethod
    def get_seller_ratings(seller_id, limit=None, skip=0):
        """Get all ratings for a seller's products, enriched with product and user details."""
        try:
            seller_id = ObjectId(seller_id)
            query = {'seller_id': seller_id}
            cursor = mongo.db.ratings.find(query).sort('created_at', -1)

            if skip:
                cursor = cursor.skip(skip)
            if limit:
                cursor = cursor.limit(limit)
            
            ratings = [Rating.from_bson(doc) for doc in cursor]
            
            # Enrich with product name and user name
            from app.services.product_service import ProductService
            from app.services.service_service import ServiceService
            from app.services.user_service import UserService
            
            enriched_ratings = []
            for r in ratings:
                try:
                    r_dict = r.to_dict()
                    # Use stored item_type from DB; fall back to lookup only if not saved
                    item_type = getattr(r, 'item_type', None) or 'product'
                    product_name = None
                    user_name = 'Unknown User'

                    try:
                        if item_type == 'service':
                            svc = ServiceService.get_service_by_id(r.product_id)
                            if svc:
                                product_name = getattr(svc, 'service_name', None)
                            if not product_name:
                                # Fallback: maybe stored wrong, check product
                                product = ProductService.get_product_by_id(r.product_id)
                                if product:
                                    item_type = 'product'
                                    product_name = getattr(product, 'product_name', None)
                        else:
                            product = ProductService.get_product_by_id(r.product_id)
                            if product:
                                product_name = getattr(product, 'product_name', None)
                            else:
                                # item was deleted or is actually a service
                                svc = ServiceService.get_service_by_id(r.product_id)
                                if svc:
                                    item_type = 'service'
                                    product_name = getattr(svc, 'service_name', None)
                    except Exception:
                        pass

                    # Skip orphaned reviews (item no longer exists)
                    if not product_name:
                        continue

                    try:
                        user = UserService.get_user_by_id(r.user_id)
                        if user:
                            first = getattr(user, 'first_name', '') or ''
                            last = getattr(user, 'last_name', '') or ''
                            user_name = (f"{first} {last}".strip()
                                        or getattr(user, 'username', 'Unknown User'))
                    except Exception:
                        pass

                    r_dict['item_type'] = item_type
                    r_dict['product_name'] = product_name
                    r_dict['user_name'] = user_name
                    enriched_ratings.append(r_dict)
                except Exception:
                    pass  # skip broken records silently
                
            return enriched_ratings
        except Exception as e:
            raise Exception(f"Error fetching seller ratings: {str(e)}")

    @staticmethod
    def get_all_ratings(limit=None, skip=0):
        """Get all ratings system-wide, enriched with product, seller, and user details."""
        try:
            cursor = mongo.db.ratings.find({}).sort('created_at', -1)
            if skip:
                cursor = cursor.skip(skip)
            if limit:
                cursor = cursor.limit(limit)
                
            ratings = [Rating.from_bson(doc) for doc in cursor]
            
            from app.services.product_service import ProductService
            from app.services.service_service import ServiceService
            from app.services.user_service import UserService
            from app.services.seller_service import SellerService
            
            enriched_ratings = []
            for r in ratings:
                try:
                    r_dict = r.to_dict()
                    # Use stored item_type from DB; fall back to lookup only when missing
                    item_type = getattr(r, 'item_type', None) or 'product'
                    product_name = None
                    user_name = 'Unknown User'
                    user_image = None
                    seller_name = 'No Seller'

                    try:
                        if item_type == 'service':
                            svc = ServiceService.get_service_by_id(r.product_id)
                            if svc:
                                product_name = getattr(svc, 'service_name', None)
                            if not product_name:
                                product = ProductService.get_product_by_id(r.product_id)
                                if product:
                                    item_type = 'product'
                                    product_name = getattr(product, 'product_name', None)
                        else:
                            product = ProductService.get_product_by_id(r.product_id)
                            if product:
                                product_name = getattr(product, 'product_name', None)
                            else:
                                svc = ServiceService.get_service_by_id(r.product_id)
                                if svc:
                                    item_type = 'service'
                                    product_name = getattr(svc, 'service_name', None)
                    except Exception:
                        pass

                    # Skip orphaned reviews (product/service no longer exists)
                    if not product_name:
                        continue

                    try:
                        user = UserService.get_user_by_id(r.user_id)
                        if user:
                            first = getattr(user, 'first_name', '') or ''
                            last = getattr(user, 'last_name', '') or ''
                            user_name = (f"{first} {last}".strip()
                                        or getattr(user, 'username', 'Unknown User'))
                            user_image = getattr(user, 'image_url', None)
                    except Exception:
                        pass

                    try:
                        seller = SellerService.get_seller_by_id(r.seller_id) if r.seller_id else None
                        if seller:
                            first = getattr(seller, 'first_name', '') or ''
                            last = getattr(seller, 'last_name', '') or ''
                            seller_name = (f"{first} {last}".strip()
                                          or getattr(seller, 'trade_id', 'Unknown Seller'))
                    except Exception:
                        pass

                    r_dict['item_type'] = item_type
                    r_dict['product_name'] = product_name
                    r_dict['user_name'] = user_name
                    r_dict['user_image'] = user_image
                    r_dict['seller_name'] = seller_name
                    enriched_ratings.append(r_dict)
                except Exception:
                    pass  # skip broken records silently
                
            return enriched_ratings
        except Exception as e:
            raise Exception(f"Error fetching all ratings: {str(e)}")


