"""
Analytics routes for dashboard data
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app.services.analytics_service import AnalyticsService
from app import mongo

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


@analytics_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get overall statistics"""
    try:
        # Check if user is master
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        stats = AnalyticsService.get_stats()
        return jsonify({'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500


@analytics_bp.route('/sales-by-category', methods=['GET'])
@jwt_required()
def get_sales_by_category():
    """Get sales by category"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_sales_by_category(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get sales by category: {str(e)}'}), 500


@analytics_bp.route('/sales-trend', methods=['GET'])
@jwt_required()
def get_sales_trend():
    """Get sales trend over time"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_sales_trend(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get sales trend: {str(e)}'}), 500


@analytics_bp.route('/orders-by-status', methods=['GET'])
@jwt_required()
def get_orders_by_status():
    """Get orders grouped by status"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_orders_by_status(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get orders by status: {str(e)}'}), 500


@analytics_bp.route('/revenue-vs-commissions', methods=['GET'])
@jwt_required()
def get_revenue_vs_commissions():
    """Get revenue vs commissions"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_revenue_vs_commissions(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get revenue vs commissions: {str(e)}'}), 500


@analytics_bp.route('/customer-growth', methods=['GET'])
@jwt_required()
def get_customer_growth():
    """Get customer growth over time"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_customer_growth(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get customer growth: {str(e)}'}), 500


@analytics_bp.route('/returning-vs-new', methods=['GET'])
@jwt_required()
def get_returning_vs_new():
    """Get returning vs new customers"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_returning_vs_new(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get returning vs new: {str(e)}'}), 500


@analytics_bp.route('/stock-levels', methods=['GET'])
@jwt_required()
def get_stock_levels():
    """Get stock/inventory levels"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_stock_levels(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get stock levels: {str(e)}'}), 500


@analytics_bp.route('/top-products', methods=['GET'])
@jwt_required()
def get_top_products():
    """Get top products by rating or sales"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        sort_by = request.args.get('sort_by', 'rating')  # 'rating' or 'sales'
        limit = request.args.get('limit', type=int, default=5)
        data = AnalyticsService.get_top_products(period, sort_by=sort_by, limit=limit)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get top products: {str(e)}'}), 500


@analytics_bp.route('/sales-by-seller', methods=['GET'])
@jwt_required()
def get_sales_by_seller():
    """Get sales by seller"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        period = request.args.get('period', 'monthly')
        data = AnalyticsService.get_sales_by_seller(period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get sales by seller: {str(e)}'}), 500


@analytics_bp.route('/active-counts', methods=['GET'])
@jwt_required()
def get_active_counts():
    """Get active users and sellers count"""
    try:
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        # Count active users (users with active socket connection)
        # Active users = users with socket_id (connected via socket)
        active_users = mongo.db.users.count_documents({
            'socket_id': {'$ne': None}
        })
        
        # Count active sellers (sellers with is_active=True or socket_id)
        active_sellers = mongo.db.sellers.count_documents({
            '$or': [
                {'is_active': True},
                {'socket_id': {'$ne': None}}
            ]
        })
        
        return jsonify({
            'activeUsers': active_users,
            'activeSellers': active_sellers
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get active counts: {str(e)}'}), 500

