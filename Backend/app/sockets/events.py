"""
Socket.IO event handlers - minimal configuration
"""
from flask_socketio import emit, disconnect
from flask import request
from flask_jwt_extended import decode_token
from bson import ObjectId
from app import mongo
from datetime import datetime
from app.utils.active_counters import (
    increment_counter,
    decrement_counter,
    register_socket,
    unregister_socket,
    get_role_for_socket,
    get_all_counts
)


def register_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect', namespace='/')
    def handle_connect(auth):
        """Handle client connection (for authenticated users with tokens)"""
        try:
            # Check if this is an active counter connection (handled by active_counters.py)
            # Active counter connections use query parameter 'role' and don't have auth tokens
            role = request.args.get('role', '').lower()
            socket_id = request.sid
            
            if role in ['user', 'seller', 'master', 'outlet']:
                # This is an active counter connection - handle it here
                print(f"[Socket Events] Active counter connection detected - Role: {role}, Socket ID: {socket_id}")
                
                # Check if already registered
                existing_role = get_role_for_socket(socket_id)
                if existing_role:
                    print(f"[Socket Events] Socket {socket_id} already registered as {existing_role}, skipping")
                    counts = get_all_counts()
                    emit('active_counts', counts)
                    return
                
                # Register and increment
                print(f"[Socket Events] Registering socket {socket_id} as {role}")
                register_socket(socket_id, role)
                print(f"[Socket Events] Socket registered, calling increment_counter")
                
                try:
                    counts = increment_counter(role)
                    print(f"[Socket Events] increment_counter returned: {counts}")
                except Exception as e:
                    print(f"[Socket Events] ERROR calling increment_counter: {e}")
                    import traceback
                    traceback.print_exc()
                    counts = get_all_counts()
                
                print(f"[Socket Events] {role.capitalize()} connected. Socket ID: {socket_id}. Counts: {counts}")
                print(f"[Socket Events] About to broadcast active_counts: {counts}")
                
                # Broadcast to all clients - use room=None to broadcast to all
                try:
                    print(f"[Socket Events] Calling socketio.emit with counts: {counts}")
                    socketio.emit('active_counts', counts, namespace='/', room=None)
                    print(f"[Socket Events] Successfully broadcasted active_counts to all clients")
                except Exception as e:
                    print(f"[Socket Events] Error broadcasting active_counts: {e}")
                    import traceback
                    traceback.print_exc()
                
                # Send confirmation
                emit('connected', {
                    'message': f'Connected as {role}',
                    'role': role,
                    'socket_id': socket_id,
                    'counts': counts
                })
                return
            
            # Only process connections with auth tokens (for other features)
            print(f"[Socket Events] Processing authenticated connection (no role in query). Socket ID: {request.sid}")
            
            # Get user info from auth token
            user_id = None
            user_type = None
            username = None
            
            if auth and 'token' in auth:
                try:
                    decoded = decode_token(auth['token'])
                    user_id = decoded.get('sub') or decoded.get('user_id')
                    user_type = decoded.get('user_type')  # 'master', 'seller', 'user', 'outlet_man'
                    username = decoded.get('username')
                except Exception:
                    pass
            
            # Update user status to 'active' and save socket ID if user_id is provided
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    socket_id = request.sid  # Get socket session ID
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'active',
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': True,
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                        # Emit seller connected event for analytics (broadcast to all clients)
                        socketio.emit('seller:connected', {
                            'seller_id': str(user_id),
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/')
                    elif user_type == 'user':
                        mongo.db.users.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                        # Emit user connected event for analytics (broadcast to all clients)
                        socketio.emit('user:connected', {
                            'user_id': str(user_id),
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/')
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                except Exception as e:
                    print(f"Error updating user status on connect: {e}")
                    pass
            
            emit('connected', {
                'message': 'Connected successfully',
                'user_id': user_id,
                'user_type': user_type
            })
        except Exception as e:
            emit('error', {'message': f'Connection error: {str(e)}'})
    
    @socketio.on('disconnect', namespace='/')
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            socket_id = request.sid
            
            # First, handle active counter disconnection
            role = unregister_socket(socket_id)
            if role:
                # Decrement counter for active counter connections
                counts = decrement_counter(role)
                print(f"[Socket Events] {role.capitalize()} disconnected (active counter). Socket ID: {socket_id}. Counts: {counts}")
                # Broadcast updated counts - use room=None to broadcast to all
                socketio.emit('active_counts', counts, namespace='/', room=None)
            
            # Find user by socket_id and update status
            # Check masters collection
            master = mongo.db.master.find_one({'socket_id': socket_id})
            if master:
                mongo.db.master.update_one(
                    {'_id': master['_id']},
                    {'$set': {
                        'status': 'not_active',
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
            
            # Check sellers collection
            seller = mongo.db.sellers.find_one({'socket_id': socket_id})
            if seller:
                mongo.db.sellers.update_one(
                    {'_id': seller['_id']},
                    {'$set': {
                        'is_active': False,
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
                # Emit seller disconnected event for analytics
                socketio.emit('seller:disconnected', {
                    'seller_id': str(seller['_id']),
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/')
            
            # Check users collection
            user = mongo.db.users.find_one({'socket_id': socket_id})
            if user:
                mongo.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
                # Emit user disconnected event for analytics (broadcast to all clients)
                socketio.emit('user:disconnected', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/', broadcast=True)
            
            # Check outlet_men collection
            outlet_man = mongo.db.outlet_men.find_one({'socket_id': socket_id})
            if outlet_man:
                mongo.db.outlet_men.update_one(
                    {'_id': outlet_man['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.utcnow()
                    }}
                )
        except Exception as e:
            print(f"Error updating user status on disconnect: {e}")
            pass
    
    @socketio.on('user_authenticated')
    def handle_user_authenticated(data):
        """Handle user authentication via socket"""
        try:
            user_id = data.get('user_id')
            user_type = data.get('user_type')  # 'master', 'seller', 'user', 'outlet_man'
            
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    socket_id = request.sid  # Get socket session ID
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'active',
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': True,
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                        # Emit seller connected event for analytics (broadcast to all clients)
                        socketio.emit('seller:connected', {
                            'seller_id': str(user_id),
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/')
                    elif user_type == 'user':
                        mongo.db.users.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                        # Emit user connected event for analytics (broadcast to all clients)
                        socketio.emit('user:connected', {
                            'user_id': str(user_id),
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/')
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.utcnow()
                            }}
                        )
                    
                    emit('status_updated', {'status': 'active', 'socket_id': socket_id})
                except Exception as e:
                    print(f"Error updating user status on authentication: {e}")
                    pass
        except Exception as e:
            emit('error', {'message': f'Status update error: {str(e)}'})
    
    @socketio.on('user_logout')
    def handle_user_logout(data):
        """Handle user logout via socket"""
        try:
            user_id = data.get('user_id')
            user_type = data.get('user_type')  # 'master', 'seller', 'user', 'outlet_man'
            
            if user_id and user_type:
                try:
                    user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
                    
                    if user_type == 'master':
                        mongo.db.master.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'status': 'not_active',
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': False,
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'user':
                        mongo.db.users.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': None,
                                'last_disconnected_at': datetime.utcnow()
                            }}
                        )
                    
                    emit('status_updated', {'status': 'not_active'})
                except Exception as e:
                    print(f"Error updating user status on logout: {e}")
                    pass
        except Exception as e:
            emit('error', {'message': f'Status update error: {str(e)}'})
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping for connection testing"""
        emit('pong', {'message': 'pong'})
    
    @socketio.on('analytics:request-data')
    def handle_analytics_request(data):
        """Handle analytics data request via socket"""
        try:
            from app.services.analytics_service import AnalyticsService
            
            period = data.get('period', 'monthly')
            
            # Get all analytics data
            stats = AnalyticsService.get_stats()
            sales_by_category = AnalyticsService.get_sales_by_category(period)
            sales_trend = AnalyticsService.get_sales_trend(period)
            orders_by_status = AnalyticsService.get_orders_by_status(period)
            revenue_vs_commissions = AnalyticsService.get_revenue_vs_commissions(period)
            customer_growth = AnalyticsService.get_customer_growth(period)
            returning_vs_new = AnalyticsService.get_returning_vs_new(period)
            stock_levels = AnalyticsService.get_stock_levels(period)
            top_products = AnalyticsService.get_top_products(period)
            sales_by_seller = AnalyticsService.get_sales_by_seller(period)
            
            # Emit analytics data back to client
            emit('analytics:data', {
                'success': True,
                'data': {
                    'stats': stats,
                    'salesByCategory': sales_by_category,
                    'salesTrend': sales_trend,
                    'ordersByStatus': orders_by_status,
                    'revenueVsCommissions': revenue_vs_commissions,
                    'customerGrowth': customer_growth,
                    'returningVsNew': returning_vs_new,
                    'stockLevels': stock_levels,
                    'topProducts': top_products,
                    'salesBySeller': sales_by_seller
                }
            })
        except Exception as e:
            print(f"Error handling analytics request: {e}")
            emit('analytics:data', {
                'success': False,
                'error': str(e)
            })
    
    @socketio.on('user:visit-home')
    def handle_user_visit_home(data):
        """Handle when a user visits the home route"""
        try:
            socket_id = request.sid
            # Find user by socket_id and mark as on home route
            user = mongo.db.users.find_one({'socket_id': socket_id})
            if user:
                mongo.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'on_home_route': True,
                        'last_home_visit': datetime.utcnow()
                    }}
                )
                # Emit to all clients (for analytics dashboard)
                socketio.emit('user:home-visit', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/')
        except Exception as e:
            print(f"Error handling user visit home: {e}")
    
    @socketio.on('user:leave-home')
    def handle_user_leave_home(data):
        """Handle when a user leaves the home route"""
        try:
            socket_id = request.sid
            # Find user by socket_id and mark as not on home route
            user = mongo.db.users.find_one({'socket_id': socket_id})
            if user:
                mongo.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'on_home_route': False,
                        'last_home_leave': datetime.utcnow()
                    }}
                )
                # Emit to all clients (for analytics dashboard)
                socketio.emit('user:home-leave', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/', broadcast=True)
        except Exception as e:
            print(f"Error handling user leave home: {e}")
