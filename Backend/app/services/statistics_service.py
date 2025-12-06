"""
Statistics Service - Track revenue and commissions
"""
from app import mongo
from app.models.statistics import Statistics
from datetime import datetime
from bson import ObjectId


class StatisticsService:
    """Service for managing statistics data"""

    @staticmethod
    def add_revenue_and_commission(order_total, commission_rate=0.10, seller_id=None, date_key=None):
        """
        Add revenue and commission to statistics when order is completed
        Args:
            order_total: Total order amount
            commission_rate: Commission rate (default 10%)
            seller_id: Seller ID (optional, for seller-specific stats)
            date_key: Date key in format YYYY-MM-DD or YYYY-MM (defaults to current month)
        """
        try:
            if date_key is None:
                date_key = datetime.utcnow().strftime('%Y-%m')
            
            commission = order_total * commission_rate
            revenue = order_total
            
            # Update or create overall statistics
            mongo.db.statistics.update_one(
                {'date': date_key, 'seller_id': None},
                {
                    '$inc': {
                        'revenue': revenue,
                        'commissions': commission
                    },
                    '$set': {
                        'updated_at': datetime.utcnow()
                    },
                    '$setOnInsert': {
                        'created_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            # Update or create seller-specific statistics
            if seller_id:
                seller_obj_id = ObjectId(seller_id) if not isinstance(seller_id, ObjectId) else seller_id
                seller_revenue = revenue - commission  # Revenue earned by seller after commission
                
                mongo.db.statistics.update_one(
                    {'date': date_key, 'seller_id': seller_obj_id},
                    {
                        '$inc': {
                            'seller_revenue': seller_revenue,
                            'seller_commission': commission,
                            'revenue': revenue,  # Also track total revenue for this seller
                            'commissions': commission
                        },
                        '$set': {
                            'updated_at': datetime.utcnow()
                        },
                        '$setOnInsert': {
                            'created_at': datetime.utcnow(),
                            'date': date_key,
                            'seller_id': seller_obj_id
                        }
                    },
                    upsert=True
                )
            
            return True
        except Exception as e:
            print(f"Error adding revenue and commission: {e}")
            return False

    @staticmethod
    def get_revenue_vs_commissions(period='monthly'):
        """Get revenue vs commissions for a period"""
        try:
            # Get statistics grouped by date
            pipeline = [
                {'$match': {'seller_id': None}},  # Only overall stats
                {'$group': {
                    '_id': '$date',
                    'revenue': {'$sum': '$revenue'},
                    'commissions': {'$sum': '$commissions'}
                }},
                {'$sort': {'_id': 1}},
                {'$project': {
                    '_id': 0,
                    'date': '$_id',
                    'revenue': 1,
                    'commissions': 1
                }}
            ]
            
            results = list(mongo.db.statistics.aggregate(pipeline))
            
            return [
                {
                    'date': r.get('date', ''),
                    'revenue': round(r.get('revenue', 0), 2),
                    'commissions': round(r.get('commissions', 0), 2)
                }
                for r in results
            ]
        except Exception as e:
            print(f"Error getting revenue vs commissions: {e}")
            return []

    @staticmethod
    def get_seller_revenue(period='monthly'):
        """Get revenue earned by each seller (after commission deduction)"""
        try:
            pipeline = [
                {'$match': {'seller_id': {'$ne': None}}},
                {'$group': {
                    '_id': '$seller_id',
                    'total_revenue': {'$sum': '$seller_revenue'},
                    'total_commissions': {'$sum': '$seller_commission'},
                    'order_count': {'$sum': 1}  # Approximate count
                }},
                {'$sort': {'total_revenue': -1}},
                {'$project': {
                    '_id': 0,
                    'seller_id': '$_id',
                    'revenue': '$total_revenue',
                    'commissions': '$total_commissions',
                    'orders': '$order_count'
                }}
            ]
            
            results = list(mongo.db.statistics.aggregate(pipeline))
            
            # Get seller names
            result = []
            for r in results:
                seller_id = r.get('seller_id')
                if seller_id:
                    seller = mongo.db.sellers.find_one({'_id': ObjectId(seller_id)})
                    seller_name = seller.get('name', 'Unknown') if seller else 'Unknown'
                else:
                    seller_name = 'Unknown'
                
                result.append({
                    'seller': seller_name,
                    'seller_id': str(seller_id),
                    'sales': round(r.get('revenue', 0), 2),
                    'revenue': round(r.get('revenue', 0), 2),  # Revenue earned by seller
                    'orders': r.get('orders', 0)
                })
            
            return result
        except Exception as e:
            print(f"Error getting seller revenue: {e}")
            return []

