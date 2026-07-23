"""
Sales Report Routes
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app.services.sales_report_service import SalesReportService

sales_report_bp = Blueprint('sales_report', __name__, url_prefix='/api/sales-report')

@sales_report_bp.route('/', methods=['GET'])
@jwt_required()
def get_sales_report():
    """Get sales report data with filters and pagination"""
    try:
        # Check if user is master
        claims = get_jwt()
        user_type = claims.get('user_type')
        
        if user_type != 'master':
            return jsonify({'error': 'Unauthorized. Master access required.'}), 403
        
        # Extract query parameters
        filters = {
            'date_range': request.args.get('dateRange', 'all'),
            'start_date': request.args.get('startDate'),
            'end_date': request.args.get('endDate'),
            'status': request.args.get('status', 'all'),
            'payment_method': request.args.get('paymentMethod', 'all'),
            'search': request.args.get('search', '')
        }
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        data = SalesReportService.get_sales_report_data(filters, page, limit)
        return jsonify(data), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get sales report data: {str(e)}'}), 500
