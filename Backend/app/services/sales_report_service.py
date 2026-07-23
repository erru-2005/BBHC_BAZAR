"""
Sales Report Service - Computes sales report data for the admin dashboard
"""
from app import mongo
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import math

class SalesReportService:
    """Service for computing sales report data"""
    
    @staticmethod
    def _parse_date(date_str):
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            return None

    @staticmethod
    def get_sales_report_data(filters, page=1, limit=20):
        """
        Get paginated sales report data based on filters.
        Filters: date_range, start_date, end_date, status, payment_method, category, search
        """
        match_query = {}
        
        # 1. Date Filtering
        now = datetime.now(timezone.utc)
        date_range = filters.get('date_range', 'all')
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')
        
        if date_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            match_query['created_at'] = {'$gte': start}
        elif date_range == 'yesterday':
            start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            match_query['created_at'] = {'$gte': start, '$lt': end}
        elif date_range == 'last7days':
            start = now - timedelta(days=7)
            match_query['created_at'] = {'$gte': start}
        elif date_range == 'last30days':
            start = now - timedelta(days=30)
            match_query['created_at'] = {'$gte': start}
        elif date_range == 'thisMonth':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            match_query['created_at'] = {'$gte': start}
        elif date_range == 'lastMonth':
            end = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            start = (end - timedelta(days=1)).replace(day=1)
            match_query['created_at'] = {'$gte': start, '$lt': end}
        elif date_range == 'thisYear':
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            match_query['created_at'] = {'$gte': start}
        elif date_range == 'custom' and start_date and end_date:
            s_date = SalesReportService._parse_date(start_date)
            e_date = SalesReportService._parse_date(end_date)
            if s_date and e_date:
                match_query['created_at'] = {'$gte': s_date, '$lte': e_date}
        
        # 2. Status Filtering
        status = filters.get('status')
        if status and status != 'all':
            if ',' in status:
                status_list = [s.strip() for s in status.split(',')]
                match_query['status'] = {'$in': status_list}
            else:
                match_query['status'] = status
            
            
        # 3. Seller ID / Name Filtering
        search = filters.get('search')
        if search:
            search_str = search.strip()
            search_regex = {'$regex': search_str, '$options': 'i'}
            or_conditions = [
                {'seller_snapshot.first_name': search_regex},
                {'seller_snapshot.last_name': search_regex},
                {'seller_snapshot.trade_id': search_regex},
            ]
            try:
                seller_oid = ObjectId(search_str)
                or_conditions.append({'seller_id': seller_oid})
            except:
                pass
            match_query['$or'] = or_conditions
            
        # Pagination
        skip = (page - 1) * limit
        
        total_orders_count = mongo.db.orders.count_documents(match_query)
        orders_cursor = mongo.db.orders.find(match_query).sort('created_at', -1).skip(skip).limit(limit)
        
        # Serialize orders
        serialized_orders = []
        for order in orders_cursor:
            order_dict = order.copy()
            order_dict['_id'] = str(order_dict['_id'])
            if 'product_id' in order_dict: order_dict['product_id'] = str(order_dict['product_id'])
            if 'user_id' in order_dict: order_dict['user_id'] = str(order_dict['user_id'])
            if 'seller_id' in order_dict and order_dict['seller_id']: order_dict['seller_id'] = str(order_dict['seller_id'])
            
            # format dates
            if 'created_at' in order_dict and isinstance(order_dict['created_at'], datetime):
                order_dict['created_at'] = order_dict['created_at'].isoformat()
            if 'updated_at' in order_dict and isinstance(order_dict['updated_at'], datetime):
                order_dict['updated_at'] = order_dict['updated_at'].isoformat()
                
            serialized_orders.append(order_dict)
            
        # Compute Summary
        summary = {
            'total_revenue': 0,
            'total_orders': total_orders_count,
            'delivered_orders': 0,
            'pending_orders': 0,
            'cancelled_orders': 0,
            'returned_orders': 0,
            'total_tax': 0,
            'total_discount': 0,
            'total_shipping': 0,
            'net_revenue': 0,
        }
        
        summary_pipeline = [
            {'$match': match_query},
            {
                '$group': {
                    '_id': None,
                    'total_revenue': {'$sum': '$total_amount'},
                    'total_shipping': {'$sum': '$delivery_charge'},
                    'delivered_orders': {
                        '$sum': {'$cond': [{'$eq': ['$status', 'completed']}, 1, 0]}
                    },
                    'pending_orders': {
                        '$sum': {'$cond': [{'$in': ['$status', ['pending_seller', 'seller_accepted', 'handed_over']]}, 1, 0]}
                    },
                    'cancelled_orders': {
                        '$sum': {'$cond': [{'$in': ['$status', ['cancelled', 'cancelled_master', 'seller_rejected']]}, 1, 0]}
                    },
                    'returned_orders': {
                        '$sum': {'$cond': [{'$eq': ['$status', 'returned']}, 1, 0]}
                    }
                }
            }
        ]
        
        summary_res = list(mongo.db.orders.aggregate(summary_pipeline))
        if summary_res:
            s = summary_res[0]
            summary['total_revenue'] = s.get('total_revenue', 0)
            summary['total_shipping'] = s.get('total_shipping', 0)
            summary['delivered_orders'] = s.get('delivered_orders', 0)
            summary['pending_orders'] = s.get('pending_orders', 0)
            summary['cancelled_orders'] = s.get('cancelled_orders', 0)
            summary['returned_orders'] = s.get('returned_orders', 0)
            summary['net_revenue'] = summary['total_revenue'] - summary['total_shipping']
            
        summary['average_order_value'] = summary['total_revenue'] / total_orders_count if total_orders_count > 0 else 0
        
        # Calculate MONTHLY trend data (for line chart - Jan, Feb, Mar...)
        monthly_trend_pipeline = [
            {'$match': match_query},
            {
                '$group': {
                    '_id': {'$dateToString': {'format': '%Y-%m', 'date': '$created_at'}},
                    'sales': {'$sum': '$total_amount'},
                    'orders': {'$sum': 1}
                }
            },
            {'$sort': {'_id': 1}}
        ]
        monthly_trend_res = list(mongo.db.orders.aggregate(monthly_trend_pipeline))
        trend_data = [{'date': t['_id'], 'sales': t['sales'], 'orders': t['orders']} for t in monthly_trend_res if t['_id']]

        # Calculate ALL-TIME monthly trend (always show full year/all months regardless of filter)
        all_time_trend_pipeline = [
            {
                '$group': {
                    '_id': {'$dateToString': {'format': '%Y-%m', 'date': '$created_at'}},
                    'sales': {'$sum': '$total_amount'},
                    'orders': {'$sum': 1}
                }
            },
            {'$sort': {'_id': 1}}
        ]
        all_time_res = list(mongo.db.orders.aggregate(all_time_trend_pipeline))
        all_trend_data = [{'date': t['_id'], 'sales': t['sales'], 'orders': t['orders']} for t in all_time_res if t['_id']]

        # Calculate per-month pie breakdown (revenue by status for each month)
        monthly_pie_pipeline = [
            {
                '$group': {
                    '_id': {'$dateToString': {'format': '%Y-%m', 'date': '$created_at'}},
                    'completed_revenue': {
                        '$sum': {'$cond': [{'$eq': ['$status', 'completed']}, '$total_amount', 0]}
                    },
                    'pending_revenue': {
                        '$sum': {'$cond': [{'$in': ['$status', ['pending_seller', 'seller_accepted', 'handed_over']]}, '$total_amount', 0]}
                    },
                    'cancelled_revenue': {
                        '$sum': {'$cond': [{'$in': ['$status', ['cancelled', 'cancelled_master', 'seller_rejected']]}, '$total_amount', 0]}
                    },
                }
            },
            {'$sort': {'_id': 1}}
        ]
        monthly_pie_res = list(mongo.db.orders.aggregate(monthly_pie_pipeline))
        monthly_pie_data = {
            t['_id']: {
                'completed': t['completed_revenue'],
                'pending': t['pending_revenue'],
                'cancelled': t['cancelled_revenue'],
            }
            for t in monthly_pie_res if t['_id']
        }

        return {
            'orders': serialized_orders,
            'summary': summary,
            'trend_data': trend_data,
            'all_trend_data': all_trend_data,
            'monthly_pie_data': monthly_pie_data,
            'pagination': {
                'total': total_orders_count,
                'page': page,
                'limit': limit,
                'pages': math.ceil(total_orders_count / limit) if limit > 0 else 0,
            }
        }


