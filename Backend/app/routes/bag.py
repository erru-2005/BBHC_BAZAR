"""
Bag-related API endpoints
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.services.bag_service import BagService
from app.services.product_service import ProductService

bag_bp = Blueprint('bag', __name__)


@bag_bp.route('/bag', methods=['POST'])
@jwt_required()
def add_to_bag():
    """Add product to bag"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'user':
            return jsonify({'error': 'Only customers can add items to bag'}), 403

        user_id = get_jwt_identity()
        data = request.get_json() or {}

        product_id = data.get('product_id')
        quantity = data.get('quantity')
        selected_size = data.get('selected_size')
        selected_color = data.get('selected_color')

        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400

        if quantity is None:
            return jsonify({'error': 'Quantity is required'}), 400

        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return jsonify({'error': 'Quantity must be a valid number'}), 400

        if quantity <= 0:
            return jsonify({'error': 'Quantity must be greater than zero'}), 400

        # Verify product exists
        product = ProductService.get_product_by_id(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        bag_item = BagService.add_to_bag(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            selected_size=selected_size,
            selected_color=selected_color
        )

        return jsonify({
            'message': 'Item added to bag successfully',
            'bag_item': bag_item.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to add to bag: {str(e)}'}), 500


@bag_bp.route('/bag', methods=['GET'])
@jwt_required()
def get_bag():
    """Get user's bag items with product details"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'user':
            return jsonify({'error': 'Only customers can view bag'}), 403

        user_id = get_jwt_identity()
        bag_items = BagService.get_user_bag(user_id)

        # Enrich with product details
        bag_with_products = []
        for item in bag_items:
            product = ProductService.get_product_by_id(str(item.product_id))
            if product:
                product_dict = product.to_dict()
                # Store only essential product data
                bag_item_dict = item.to_dict()
                bag_item_dict['product'] = {
                    'id': product_dict.get('id'),
                    'product_name': product_dict.get('product_name'),
                    'thumbnail': product_dict.get('thumbnail'),
                    'selling_price': product_dict.get('selling_price'),
                    'total_selling_price': product_dict.get('total_selling_price'),  # Price with commission
                    'max_price': product_dict.get('max_price'),
                    'commission_rate': product_dict.get('commission_rate'),
                    'quantity': product_dict.get('quantity'),
                    'stock': product_dict.get('quantity', 0)
                }
                bag_with_products.append(bag_item_dict)

        return jsonify({
            'bag_items': bag_with_products,
            'count': len(bag_with_products)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get bag: {str(e)}'}), 500


@bag_bp.route('/bag/<bag_item_id>', methods=['PUT'])
@jwt_required()
def update_bag_item(bag_item_id):
    """Update bag item quantity or attributes"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'user':
            return jsonify({'error': 'Only customers can update bag items'}), 403

        user_id = get_jwt_identity()
        data = request.get_json() or {}

        quantity = data.get('quantity')
        selected_size = data.get('selected_size')
        selected_color = data.get('selected_color')

        updated_item = BagService.update_bag_item(
            bag_item_id=bag_item_id,
            user_id=user_id,
            quantity=quantity,
            selected_size=selected_size,
            selected_color=selected_color
        )

        if not updated_item:
            return jsonify({'error': 'Bag item not found or removed'}), 404

        return jsonify({
            'message': 'Bag item updated successfully',
            'bag_item': updated_item.to_dict()
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update bag item: {str(e)}'}), 500


@bag_bp.route('/bag/<bag_item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_bag(bag_item_id):
    """Remove item from bag"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'user':
            return jsonify({'error': 'Only customers can remove items from bag'}), 403

        user_id = get_jwt_identity()
        success = BagService.remove_from_bag(bag_item_id, user_id)

        if not success:
            return jsonify({'error': 'Bag item not found'}), 404

        return jsonify({
            'message': 'Item removed from bag successfully',
            'bag_item_id': bag_item_id
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to remove from bag: {str(e)}'}), 500


@bag_bp.route('/bag/clear', methods=['DELETE'])
@jwt_required()
def clear_bag():
    """Clear all items from bag"""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'user':
            return jsonify({'error': 'Only customers can clear bag'}), 403

        user_id = get_jwt_identity()
        deleted_count = BagService.clear_user_bag(user_id)

        return jsonify({
            'message': 'Bag cleared successfully',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to clear bag: {str(e)}'}), 500

