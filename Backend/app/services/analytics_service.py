"""
Analytics Service - Computes analytics data from database
"""
from app import mongo
from datetime import datetime, timedelta
from bson import ObjectId
from collections import defaultdict


class AnalyticsService:
    """Service for computing analytics data"""
    
    @staticmethod
    def _get_seller_info(seller_id=None, seller_trade_id=None, created_by_user_id=None, product_doc=None, rating_doc=None):
        """
        Comprehensive helper to get seller information from multiple sources.
        Returns: {'name': 'FirstName LastName', 'trade_id': 'TRADE_ID', 'display_name': 'FirstName LastName (TRADE_ID)'}
        """
        seller_name = None
        trade_id = None
        
        # Priority 1: Use seller_id from rating/order if available
        if seller_id:
            try:
                seller_id_obj = ObjectId(seller_id) if isinstance(seller_id, str) else seller_id
                seller = mongo.db.sellers.find_one({'_id': seller_id_obj})
                if seller:
                    first_name = seller.get('first_name', '')
                    last_name = seller.get('last_name', '')
                    trade_id = seller.get('trade_id', '')
                    if first_name or last_name:
                        seller_name = f"{first_name} {last_name}".strip()
                    else:
                        seller_name = trade_id or 'Unknown'
            except Exception:
                pass
        
        # Priority 2: Use seller_trade_id from product
        if (not seller_name or seller_name == 'Unknown') and seller_trade_id:
            seller = mongo.db.sellers.find_one({'trade_id': seller_trade_id})
            if seller:
                first_name = seller.get('first_name', '')
                last_name = seller.get('last_name', '')
                trade_id = seller.get('trade_id', '')
                if first_name or last_name:
                    seller_name = f"{first_name} {last_name}".strip()
                else:
                    seller_name = trade_id or 'Unknown'
        
        # Priority 3: Use created_by_user_id from product (might be seller ID)
        if (not seller_name or seller_name == 'Unknown') and created_by_user_id:
            try:
                user_id_obj = ObjectId(created_by_user_id) if isinstance(created_by_user_id, str) else created_by_user_id
                seller = mongo.db.sellers.find_one({'_id': user_id_obj})
                if seller:
                    first_name = seller.get('first_name', '')
                    last_name = seller.get('last_name', '')
                    trade_id = seller.get('trade_id', '')
                    if first_name or last_name:
                        seller_name = f"{first_name} {last_name}".strip()
                    else:
                        seller_name = trade_id or 'Unknown'
            except Exception:
                pass
        
        # Priority 4: Check product document for seller_trade_id or created_by_user_id
        if (not seller_name or seller_name == 'Unknown') and product_doc:
            product_trade_id = product_doc.get('seller_trade_id')
            if product_trade_id:
                seller = mongo.db.sellers.find_one({'trade_id': product_trade_id})
                if seller:
                    first_name = seller.get('first_name', '')
                    last_name = seller.get('last_name', '')
                    trade_id = seller.get('trade_id', '')
                    if first_name or last_name:
                        seller_name = f"{first_name} {last_name}".strip()
                    else:
                        seller_name = trade_id or 'Unknown'
            
            if (not seller_name or seller_name == 'Unknown') and not trade_id:
                product_user_id = product_doc.get('created_by_user_id')
                if product_user_id:
                    try:
                        user_id_obj = ObjectId(product_user_id) if isinstance(product_user_id, str) else product_user_id
                        seller = mongo.db.sellers.find_one({'_id': user_id_obj})
                        if seller:
                            first_name = seller.get('first_name', '')
                            last_name = seller.get('last_name', '')
                            trade_id = seller.get('trade_id', '')
                            if first_name or last_name:
                                seller_name = f"{first_name} {last_name}".strip()
                            else:
                                seller_name = trade_id or 'Unknown'
                    except Exception:
                        pass
        
        # Priority 5: Check rating document for seller_id
        if (not seller_name or seller_name == 'Unknown') and rating_doc:
            rating_seller_id = rating_doc.get('seller_id')
            if rating_seller_id:
                try:
                    seller_id_obj = ObjectId(rating_seller_id) if isinstance(rating_seller_id, str) else rating_seller_id
                    seller = mongo.db.sellers.find_one({'_id': seller_id_obj})
                    if seller:
                        first_name = seller.get('first_name', '')
                        last_name = seller.get('last_name', '')
                        trade_id = seller.get('trade_id', '')
                        if first_name or last_name:
                            seller_name = f"{first_name} {last_name}".strip()
                        else:
                            seller_name = trade_id or 'Unknown'
                except Exception:
                    pass
        
        # Final fallback
        if not seller_name or seller_name == 'Unknown':
            seller_name = trade_id or 'Unknown'
        
        # Create display name with trade_id
        if trade_id and seller_name != trade_id and seller_name != 'Unknown':
            display_name = f"{seller_name} ({trade_id})"
        elif trade_id:
            display_name = trade_id
        else:
            display_name = seller_name
        
        return {
            'name': seller_name,
            'trade_id': trade_id or '',
            'display_name': display_name
        }
    
    @staticmethod
    def get_stats():
        """Get overall statistics"""
        try:
            total_users = mongo.db.users.count_documents({})
            total_sellers = mongo.db.sellers.count_documents({})
            
            # Count active users (users with active socket connection)
            # Active users = users with socket_id (connected via socket)
            # This counts regular users with active socket connections, not sellers/masters
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
            
            total_orders = mongo.db.orders.count_documents({})
            total_products = mongo.db.products.count_documents({})
            
            # Calculate total revenue from completed orders
            completed_orders = mongo.db.orders.find({'status': 'completed'})
            total_revenue = sum(order.get('order_total', 0) for order in completed_orders)
            
            return {
                'totalUsers': total_users,
                'activeUsers': active_users,
                'totalSellers': total_sellers,
                'activeSellers': active_sellers,
                'totalOrders': total_orders,
                'totalProducts': total_products,
                'totalRevenue': total_revenue
            }
        except Exception as e:
            print(f"Error computing stats: {e}")
            return {
                'totalUsers': 0,
                'activeUsers': 0,
                'totalSellers': 0,
                'activeSellers': 0,
                'totalOrders': 0,
                'totalProducts': 0,
                'totalRevenue': 0
            }
    
    @staticmethod
    def get_sales_by_category(period='monthly'):
        """Get sales by category - calculate total revenue by category"""
        try:
            date_filter = AnalyticsService._get_date_filter(period)
            
            # Get all categories from categories collection
            categories = list(mongo.db.categories.find({}))
            category_names = [cat.get('name') for cat in categories]
            
            # Get all completed orders in the period
            completed_orders = list(mongo.db.orders.find({
                'status': 'completed',
                'created_at': date_filter
            }))
            
            # Calculate revenue by category (not just count)
            category_sales = defaultdict(float)
            category_counts = defaultdict(int)  # Also track order count for reference
            
            for order in completed_orders:
                # Get order total amount
                order_total = order.get('total_amount') or order.get('totalAmount') or order.get('order_total') or 0
                
                # If total_amount is 0, try to calculate from quantity and unit_price
                if order_total == 0:
                    quantity = order.get('quantity', 0)
                    unit_price = order.get('unit_price') or order.get('unitPrice', 0)
                    if quantity > 0 and unit_price > 0:
                        order_total = quantity * unit_price
                
                # Get category from product_snapshot or product
                product_snapshot = order.get('product_snapshot', {})
                categories_list = product_snapshot.get('categories', [])
                
                # If categories is a list, use first category
                if categories_list and len(categories_list) > 0:
                    category_name = categories_list[0] if isinstance(categories_list[0], str) else categories_list[0].get('name', 'Uncategorized')
                else:
                    # Try to get from product_id
                    product_id = order.get('product_id')
                    if product_id:
                        try:
                            product = mongo.db.products.find_one({'_id': ObjectId(product_id)})
                            if product:
                                product_categories = product.get('categories', [])
                                if product_categories and len(product_categories) > 0:
                                    category_name = product_categories[0] if isinstance(product_categories[0], str) else product_categories[0].get('name', 'Uncategorized')
                                else:
                                    category_name = 'Uncategorized'
                            else:
                                category_name = 'Uncategorized'
                        except:
                            category_name = 'Uncategorized'
                    else:
                        category_name = 'Uncategorized'
                
                # Add revenue to category
                category_sales[category_name] += order_total
                category_counts[category_name] += 1
            
            # Create result with all categories (even if sales is 0)
            result = []
            for cat_name in category_names:
                result.append({
                    'category': cat_name,
                    'name': cat_name,
                    'value': round(category_sales.get(cat_name, 0), 2),  # Revenue amount
                    'sales': round(category_sales.get(cat_name, 0), 2),  # Also include as 'sales' for compatibility
                    'orders': category_counts.get(cat_name, 0)  # Order count for reference
                })
            
            # Sort by revenue descending
            result.sort(key=lambda x: x['value'], reverse=True)
            
            return result
        except Exception as e:
            print(f"Error computing sales by category: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def get_sales_trend(period='monthly'):
        """Get sales trend over time"""
        try:
            date_filter = AnalyticsService._get_date_filter(period)
            
            orders = list(mongo.db.orders.find({
                'status': 'completed',
                'created_at': date_filter
            }))
            
            # Group by date
            daily_sales = defaultdict(float)
            
            for order in orders:
                order_date = order.get('created_at')
                if order_date:
                    if isinstance(order_date, str):
                        order_date = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
                    elif not isinstance(order_date, datetime):
                        continue
                    
                    # Format date based on period
                    if period == 'daily':
                        date_key = order_date.strftime('%Y-%m-%d')
                    elif period == 'weekly':
                        # Get week start (Monday)
                        week_start = order_date - timedelta(days=order_date.weekday())
                        date_key = week_start.strftime('%Y-%m-%d')
                    else:  # monthly
                        date_key = order_date.strftime('%Y-%m')
                    
                    daily_sales[date_key] += order.get('order_total', 0)
            
            # Convert to sorted list
            result = [
                {'date': date, 'sales': round(revenue, 2)}
                for date, revenue in sorted(daily_sales.items())
            ]
            
            return result
        except Exception as e:
            print(f"Error computing sales trend: {e}")
            return []
    
    @staticmethod
    def get_orders_by_status(period='monthly'):
        """Get orders grouped by status"""
        try:
            date_filter = AnalyticsService._get_date_filter(period)
            
            pipeline = [
                {'$match': {'created_at': date_filter}},
                {'$group': {
                    '_id': '$status',
                    'count': {'$sum': 1}
                }},
                {'$project': {
                    '_id': 0,
                    'status': '$_id',
                    'count': 1
                }}
            ]
            
            results = list(mongo.db.orders.aggregate(pipeline))
            
            return [
                {'status': r.get('status', 'unknown'), 'count': r.get('count', 0)}
                for r in results
            ]
        except Exception as e:
            print(f"Error computing orders by status: {e}")
            return []
    
    @staticmethod
    def get_revenue_vs_commissions(period='monthly'):
        """Get revenue vs commissions earned from statistics collection"""
        try:
            from app.services.statistics_service import StatisticsService
            return StatisticsService.get_revenue_vs_commissions(period)
        except Exception as e:
            print(f"Error computing revenue vs commissions: {e}")
            return []
    
    @staticmethod
    def get_customer_growth(period='monthly'):
        """Get customer growth over time"""
        try:
            date_filter = AnalyticsService._get_date_filter(period)
            
            # Get users in the period
            users = list(mongo.db.users.find({'created_at': date_filter}))
            
            # Group by date
            daily_growth = defaultdict(int)
            
            for user in users:
                created_at = user.get('created_at')
                if created_at:
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    elif not isinstance(created_at, datetime):
                        continue
                    
                    # Format date based on period
                    if period == 'daily':
                        date_key = created_at.strftime('%Y-%m-%d')
                    elif period == 'weekly':
                        week_start = created_at - timedelta(days=created_at.weekday())
                        date_key = week_start.strftime('%Y-%m-%d')
                    else:  # monthly
                        date_key = created_at.strftime('%Y-%m')
                    
                    daily_growth[date_key] += 1
            
            # Convert to sorted list
            result = [
                {'date': date, 'count': count}
                for date, count in sorted(daily_growth.items())
            ]
            
            return result
        except Exception as e:
            print(f"Error computing customer growth: {e}")
            return []
    
    @staticmethod
    def get_returning_vs_new(period='monthly'):
        """Get returning vs new customers"""
        try:
            date_filter = AnalyticsService._get_date_filter(period)
            
            # Get all users who made orders in the period
            orders = list(mongo.db.orders.find({
                'created_at': date_filter
            }))
            
            user_order_count = defaultdict(int)
            for order in orders:
                user_id = order.get('user_id')
                if user_id:
                    user_order_count[str(user_id)] += 1
            
            new_customers = 0
            returning_customers = 0
            
            for user_id, order_count in user_order_count.items():
                if order_count == 1:
                    new_customers += 1
                else:
                    returning_customers += 1
            
            total = new_customers + returning_customers
            if total == 0:
                return {'new': 0, 'returning': 0}
            
            return {
                'new': new_customers,
                'returning': returning_customers
            }
        except Exception as e:
            print(f"Error computing returning vs new: {e}")
            return {'new': 0, 'returning': 0}
    
    @staticmethod
    def get_stock_levels(period='monthly'):
        """Get stock/inventory levels with product ID"""
        try:
            # Get all products sorted by quantity (ascending) - check both 'quantity' and 'stock_quantity'
            products = list(mongo.db.products.find({}).sort('quantity', 1).limit(20))
            
            result = []
            for product in products:
                product_id = product.get('_id')
                
                # Get stock quantity - check multiple possible field names
                stock = product.get('quantity') or product.get('stock_quantity') or product.get('inventory') or 0
                
                # Get seller info using comprehensive helper
                seller_info = AnalyticsService._get_seller_info(
                    seller_trade_id=product.get('seller_trade_id'),
                    created_by_user_id=product.get('created_by_user_id'),
                    product_doc=product
                )
                seller_name = seller_info['display_name']
                
                result.append({
                    'product_id': str(product_id),
                    'product': product.get('product_name', 'Unknown'),
                    'name': product.get('product_name', 'Unknown'),
                    'stock': stock,
                    'quantity': stock,  # Also include as 'quantity' for compatibility
                    'stock_quantity': stock,  # Also include as 'stock_quantity' for compatibility
                    'seller_name': seller_name,
                    'specification': product.get('specification', ''),
                    'selling_price': product.get('selling_price', 0),
                    'thumbnail': product.get('thumbnail', '')
                })
            
            return result
        except Exception as e:
            print(f"Error computing stock levels: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def get_top_products(period='monthly', sort_by='rating', limit=5):
        """Get top products by rating or sales"""
        try:
            if sort_by == 'rating':
                # Get top-rated products
                # Aggregate ratings to get average rating per product
                pipeline = [
                    {
                        '$group': {
                            '_id': '$product_id',
                            'avg_rating': {'$avg': '$rating'},
                            'rating_count': {'$sum': 1}
                        }
                    },
                    {
                        '$sort': {'avg_rating': -1, 'rating_count': -1}
                    },
                    {
                        '$limit': limit
                    }
                ]
                
                rating_results = list(mongo.db.ratings.aggregate(pipeline))
                
                # Get product details for each rated product
                result = []
                for rating_data in rating_results:
                    product_id = rating_data['_id']
                    product = mongo.db.products.find_one({'_id': ObjectId(product_id)})
                    
                    if product:
                        # Get seller info - check rating document for seller_id first (most reliable)
                        # Get the first rating for this product to get seller_id
                        rating_doc = mongo.db.ratings.find_one({'product_id': ObjectId(product_id)})
                        seller_id_from_rating = rating_doc.get('seller_id') if rating_doc else None
                        
                        seller_info = AnalyticsService._get_seller_info(
                            seller_id=seller_id_from_rating,
                            seller_trade_id=product.get('seller_trade_id'),
                            created_by_user_id=product.get('created_by_user_id'),
                            product_doc=product,
                            rating_doc=rating_doc
                        )
                        seller_name = seller_info['display_name']
                        
                        result.append({
                            'product_id': str(product_id),
                            'name': product.get('product_name', 'Unknown'),
                            'rating': round(rating_data['avg_rating'], 2),
                            'rating_count': rating_data['rating_count'],
                            'thumbnail': product.get('thumbnail', ''),
                            'selling_price': product.get('selling_price', 0),
                            'specification': product.get('specification', ''),
                            'seller_name': seller_name,
                            'quantity': product.get('quantity') or product.get('stock_quantity', 0)
                        })
                
                return result
            else:
                # Get top selling products (by revenue)
                date_filter = AnalyticsService._get_date_filter(period)
                
                orders = list(mongo.db.orders.find({
                    'status': 'completed',
                    'created_at': date_filter
                }))
                
                product_sales = defaultdict(lambda: {'quantity': 0, 'revenue': 0, 'product_id': None})
                
                for order in orders:
                    items = order.get('items', [])
                    for item in items:
                        product_id = item.get('product_id')
                        if product_id:
                            product = mongo.db.products.find_one({'_id': ObjectId(product_id)})
                            if product:
                                product_name = product.get('product_name', 'Unknown')
                                quantity = item.get('quantity', 0)
                                revenue = item.get('price', 0) * quantity
                                
                                if product_sales[product_name]['product_id'] is None:
                                    product_sales[product_name]['product_id'] = str(product_id)
                                
                                product_sales[product_name]['quantity'] += quantity
                                product_sales[product_name]['revenue'] += revenue
                
                # Convert to list and sort by revenue
                result = []
                for name, data in sorted(product_sales.items(), key=lambda x: x[1]['revenue'], reverse=True)[:limit]:
                    product = mongo.db.products.find_one({'_id': ObjectId(data['product_id'])})
                    if product:
                        # Get seller info using comprehensive helper
                        seller_info = AnalyticsService._get_seller_info(
                            seller_trade_id=product.get('seller_trade_id'),
                            created_by_user_id=product.get('created_by_user_id'),
                            product_doc=product
                        )
                        seller_name = seller_info['display_name']
                        
                        # Get rating stats
                        rating_pipeline = [
                            {'$match': {'product_id': ObjectId(data['product_id'])}},
                            {
                                '$group': {
                                    '_id': None,
                                    'avg_rating': {'$avg': '$rating'},
                                    'rating_count': {'$sum': 1}
                                }
                            }
                        ]
                        rating_stats = list(mongo.db.ratings.aggregate(rating_pipeline))
                        avg_rating = rating_stats[0]['avg_rating'] if rating_stats else 0
                        rating_count = rating_stats[0]['rating_count'] if rating_stats else 0
                        
                        result.append({
                            'product_id': data['product_id'],
                            'name': name,
                            'quantity': data['quantity'],
                            'revenue': round(data['revenue'], 2),
                            'thumbnail': product.get('thumbnail', ''),
                            'selling_price': product.get('selling_price', 0),
                            'specification': product.get('specification', ''),
                            'seller_name': seller_name,
                            'rating': round(avg_rating, 2) if avg_rating else 0,
                            'rating_count': rating_count
                        })
                
                return result
        except Exception as e:
            print(f"Error computing top products: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def get_sales_by_seller(period='monthly'):
        """Get sales by seller - revenue earned by each seller (after commission deduction)"""
        try:
            # Get date filter for period
            date_filter = AnalyticsService._get_date_filter(period)
            
            # Get all sellers from sellers collection
            sellers = list(mongo.db.sellers.find({}))
            
            result = []
            commission_rate = 0.10  # 10% commission
            
            for seller in sellers:
                seller_id = seller.get('_id')
                # Get seller name from first_name and last_name
                first_name = seller.get('first_name', '')
                last_name = seller.get('last_name', '')
                trade_id = seller.get('trade_id', '')
                
                # Construct seller name
                if first_name or last_name:
                    seller_name = f"{first_name} {last_name}".strip()
                else:
                    seller_name = 'Unknown'
                
                # Include trade_id in the name if available
                if trade_id and seller_name != 'Unknown':
                    seller_name = f"{seller_name} ({trade_id})"
                elif trade_id:
                    seller_name = trade_id
                
                # Find all completed orders for this seller within the period
                # Handle both ObjectId and string seller_id
                orders_query = {
                    'status': 'completed',
                    'created_at': date_filter
                }
                
                # Try to match seller_id (could be ObjectId or string)
                try:
                    orders_query['seller_id'] = ObjectId(seller_id) if isinstance(seller_id, str) else seller_id
                except:
                    orders_query['seller_id'] = seller_id
                
                orders = list(mongo.db.orders.find(orders_query))
                
                # Calculate total revenue from completed orders
                # Check multiple field names for order total
                total_revenue = 0
                for order in orders:
                    # Order model uses 'total_amount' in BSON
                    order_total = order.get('total_amount') or order.get('totalAmount') or order.get('order_total') or 0
                    if order_total == 0:
                        # If still 0, try calculating from quantity and unit_price
                        quantity = order.get('quantity', 0)
                        unit_price = order.get('unit_price', 0)
                        if quantity > 0 and unit_price > 0:
                            order_total = quantity * unit_price
                    total_revenue += order_total
                
                # Calculate seller revenue after commission deduction
                seller_revenue = total_revenue * (1 - commission_rate)
                
                # Only include sellers with at least one completed order
                if len(orders) > 0:
                    result.append({
                        'seller': seller_name,
                        'seller_id': str(seller_id),
                        'trade_id': trade_id,
                        'sales': round(seller_revenue, 2),
                        'revenue': round(seller_revenue, 2),  # Revenue earned by seller (after commission)
                        'orders': len(orders),
                        'total_sales': round(total_revenue, 2)  # Total sales before commission
                    })
            
            # Sort by revenue descending
            result.sort(key=lambda x: x['revenue'], reverse=True)
            
            return result
        except Exception as e:
            print(f"Error computing sales by seller: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def _get_date_filter(period='monthly'):
        """Get date filter based on period"""
        now = datetime.utcnow()
        
        if period == 'daily':
            start_date = now - timedelta(days=30)
        elif period == 'weekly':
            start_date = now - timedelta(weeks=12)
        else:  # monthly
            start_date = now - timedelta(days=365)
        
        return {'$gte': start_date, '$lte': now}

