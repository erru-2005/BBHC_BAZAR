"""
Rating routes - handles product rating endpoints
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.rating_service import RatingService
from app.services.product_service import ProductService
from bson import ObjectId

ratings_bp = Blueprint('ratings', __name__)


@ratings_bp.route('/products/<product_id>/ratings', methods=['POST'])
@jwt_required()
def create_or_update_rating(product_id):
    """Create or update a rating for a product (requires authentication)"""
    try:
        # Get current user info from JWT token
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')

        # Validate product exists
        product = ProductService.get_product_by_id(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        data = request.get_json() or {}
        
        # Validate required fields
        if 'rating' not in data:
            return jsonify({'error': 'Rating is required'}), 400

        rating_value = int(data['rating'])
        if rating_value < 1 or rating_value > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400

        # Get seller_id from seller_trade_id if available
        seller_id = None
        if hasattr(product, 'seller_trade_id') and product.seller_trade_id:
            from app.services.seller_service import SellerService
            seller = SellerService.get_seller_by_trade_id(product.seller_trade_id)
            if seller:
                seller_id = str(seller._id)

        # Prepare rating data
        rating_data = {
            'product_id': product_id,
            'user_id': current_user_id,
            'rating': rating_value,
            'review_text': data.get('review_text'),
            'seller_id': seller_id
        }

        # Create or update rating
        rating = RatingService.create_or_update_rating(rating_data)
        
        return jsonify({
            'message': 'Rating saved successfully',
            'rating': rating.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error saving rating: {str(e)}'}), 500


@ratings_bp.route('/products/<product_id>/ratings/me', methods=['GET'])
@jwt_required()
def get_my_rating(product_id):
    """Get current user's rating for a product"""
    try:
        current_user_id = get_jwt_identity()
        
        rating = RatingService.get_user_rating(product_id, current_user_id)
        
        if rating:
            return jsonify({'rating': rating.to_dict()}), 200
        else:
            return jsonify({'rating': None}), 200

    except Exception as e:
        return jsonify({'error': f'Error fetching rating: {str(e)}'}), 500


@ratings_bp.route('/products/<product_id>/ratings', methods=['GET'])
def get_product_ratings(product_id):
    """Get all ratings for a product (public endpoint)"""
    try:
        limit = request.args.get('limit', type=int)
        skip = request.args.get('skip', type=int, default=0)

        ratings = RatingService.get_product_ratings(product_id, limit=limit, skip=skip)
        
        return jsonify({
            'ratings': [rating.to_dict() for rating in ratings],
            'total': len(ratings)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error fetching ratings: {str(e)}'}), 500


@ratings_bp.route('/products/<product_id>/ratings/stats', methods=['GET'])
def get_product_rating_stats(product_id):
    """Get rating statistics for a product (public endpoint)"""
    try:
        stats = RatingService.get_product_rating_stats(product_id)
        
        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': f'Error fetching rating stats: {str(e)}'}), 500


@ratings_bp.route('/ratings/category/<rating_category>', methods=['GET'])
def get_products_by_rating_category(rating_category):
    """Get products categorized by rating (1_star, 2_star, etc.)"""
    try:
        limit = request.args.get('limit', type=int, default=20)
        skip = request.args.get('skip', type=int, default=0)

        product_ids = RatingService.get_products_by_rating_category(
            rating_category, 
            limit=limit, 
            skip=skip
        )
        
        # Convert ObjectIds to strings
        product_ids_str = [str(pid) for pid in product_ids]
        
        return jsonify({
            'product_ids': product_ids_str,
            'category': rating_category,
            'total': len(product_ids_str)
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error fetching products: {str(e)}'}), 500


@ratings_bp.route('/ratings/<rating_id>', methods=['DELETE'])
@jwt_required()
def delete_rating(rating_id):
    """Delete a rating (only by the user who created it)"""
    try:
        current_user_id = get_jwt_identity()
        
        deleted = RatingService.delete_rating(rating_id, current_user_id)
        
        if deleted:
            return jsonify({'message': 'Rating deleted successfully'}), 200
        else:
            return jsonify({'error': 'Rating not found or could not be deleted'}), 404

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error deleting rating: {str(e)}'}), 500

