"""
Socket.IO event handlers - minimal configuration
"""
from flask_socketio import emit, disconnect, ConnectionRefusedError
from flask import request
from flask_jwt_extended import decode_token
from bson import ObjectId
from app import mongo
from datetime import datetime, timezone
from app.utils.active_counters import (
    increment_counter,
    decrement_counter,
    register_socket,
    unregister_socket,
    get_role_for_socket,
    get_all_counts
)
from app.services.blacklist_service import BlacklistService


def register_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect', namespace='/')
    def handle_connect(auth=None):
        """Handle client connection (permissive - allows guest access)"""
        try:
            print(f"[Socket Events] Processing connection request. SID: {request.sid}")
            
            # 1. Check for token strictly only if provided
            if not auth or 'token' not in auth:
                print(f"[Socket Events] Guest connected. SID: {request.sid}")
                
                # Check for role registration even for guests
                role = request.args.get('role', '').lower()
                if role:
                    valid_roles = ['user', 'seller', 'master', 'outlet']
                    if role in valid_roles:
                        register_socket(request.sid, role)
                        counts = increment_counter(role)
                        # Use contextual emit for broadcast to avoid handshake conflicts
                        emit('active_counts', counts, broadcast=True, namespace='/')
                
                # Allow guest connection
                emit('connected', {
                    'message': 'Connected as guest',
                    'authenticated': False
                })
                return True # Explicitly return True to accept connection

            # 2. Token Verification (if token is provided)
            try:
                decoded = decode_token(auth['token'])
                user_id = decoded.get('sub') or decoded.get('user_id')
                user_type = decoded.get('user_type')
                
                if not user_id or not user_type:
                    raise ValueError("Missing identity in token")
            except Exception as e:
                print(f"[Socket Events] Connection refused: Invalid token provided. Error: {str(e)}")
                # If they tried to provide a token but it's invalid, we should probably refuse 
                # OR just treat them as guest. User said "if has acces token then have to connect else also connect"
                # which might mean "if token is there it must be valid".
                # To be safe and follow "direct connect without access code", we'll just treat as guest if token is invalid
                # but log the error.
                emit('connected', {
                    'message': 'Connected as guest (invalid token)',
                    'authenticated': False,
                    'error': 'Invalid token'
                })
                return True
                
            # 3. Real-time Security Check (Blacklist & Existence)
            if user_type in ['seller', 'outlet_man'] and BlacklistService.is_blacklisted(user_id, user_type):
                print(f"[Socket Events] Connection refused: User {user_id} ({user_type}) is blacklisted.")
                # For blacklisted users, we DO refuse connection
                raise ConnectionRefusedError('Account is blacklisted')
            
            # 4. Update Online Status in DB
            user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
            socket_id = request.sid
            
            if user_type == 'master':
                mongo.db.master.update_one(
                    {'_id': user_obj_id},
                    {'$set': {
                        'status': 'active',
                        'socket_id': socket_id,
                        'last_connected_at': datetime.now(timezone.utc)
                    }}
                )
            elif user_type == 'seller':
                mongo.db.sellers.update_one(
                    {'_id': user_obj_id},
                    {'$set': {
                        'is_active': True,
                        'socket_id': socket_id,
                        'last_connected_at': datetime.now(timezone.utc)
                    }}
                )
                emit('seller:connected', {
                    'seller_id': str(user_id),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, broadcast=True, namespace='/')
            elif user_type == 'user':
                mongo.db.users.update_one(
                    {'_id': user_obj_id},
                    {'$set': {
                        'socket_id': socket_id,
                        'last_connected_at': datetime.now(timezone.utc)
                    }}
                )
                emit('user:connected', {
                    'user_id': str(user_id),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, broadcast=True, namespace='/')
            elif user_type == 'outlet_man':
                mongo.db.outlet_men.update_one(
                    {'_id': user_obj_id},
                    {'$set': {
                        'socket_id': socket_id,
                        'last_connected_at': datetime.now(timezone.utc)
                    }}
                )
                
            # 5. Handle Active Counter (Role-based counting)
            # This handles connections that pass ?role=user/seller/etc in the query string
            role = request.args.get('role', '').lower()
            if role:
                valid_roles = ['user', 'seller', 'master', 'outlet']
                if role in valid_roles:
                    # Check if already registered
                    existing_role = get_role_for_socket(socket_id)
                    if not existing_role:
                        register_socket(socket_id, role)
                        counts = increment_counter(role)
                        print(f"[Socket Events] Registered SID {socket_id} as {role}. New counts: {counts}")
                        # Use contextual emit for broadcast to avoid handshake conflicts
                        emit('active_counts', counts, broadcast=True, namespace='/')
                        emit('active_counter_status', {
                            'message': f'Counting as {role}',
                            'role': role,
                            'counts': counts
                        })

            # Finalize Authenticated Connection
            print(f"[Socket Events] User {user_id} ({user_type}) authenticated. SID: {request.sid}")
            emit('connected', {
                'message': 'Connected successfully',
                'authenticated': True,
                'user_id': str(user_id),
                'user_type': user_type
            })
            return True
            
        except ConnectionRefusedError:
            raise
        except Exception as e:
            print(f"[Socket Events] Internal connection error: {str(e)}")
            # Fallback to guest connection instead of failing
            emit('connected', {
                'message': 'Connected as guest (server error during auth)',
                'authenticated': False
            })
            return True
    
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
                        'last_disconnected_at': datetime.now(timezone.utc)
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
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                # Emit seller disconnected event for analytics
                socketio.emit('seller:disconnected', {
                    'seller_id': str(seller['_id']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/')
            
            # Check users collection
            user = mongo.db.users.find_one({'socket_id': socket_id})
            if user:
                mongo.db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
                    }}
                )
                # Emit user disconnected event for analytics (broadcast to all clients)
                socketio.emit('user:disconnected', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/', broadcast=True)
            
            # Check outlet_men collection
            outlet_man = mongo.db.outlet_men.find_one({'socket_id': socket_id})
            if outlet_man:
                mongo.db.outlet_men.update_one(
                    {'_id': outlet_man['_id']},
                    {'$set': {
                        'socket_id': None,
                        'last_disconnected_at': datetime.now(timezone.utc)
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
                                'last_connected_at': datetime.now(timezone.utc)
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': True,
                                'socket_id': socket_id,
                                'last_connected_at': datetime.now(timezone.utc)
                            }}
                        )
                        # Emit seller connected event for analytics (broadcast to all clients)
                        socketio.emit('seller:connected', {
                            'seller_id': str(user_id),
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }, namespace='/')
                    elif user_type == 'user':
                        mongo.db.users.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.now(timezone.utc)
                            }}
                        )
                        # Emit user connected event for analytics (broadcast to all clients)
                        socketio.emit('user:connected', {
                            'user_id': str(user_id),
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }, namespace='/')
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': socket_id,
                                'last_connected_at': datetime.now(timezone.utc)
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
                                'last_disconnected_at': datetime.now(timezone.utc)
                            }}
                        )
                    elif user_type == 'seller':
                        mongo.db.sellers.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'is_active': False,
                                'socket_id': None,
                                'last_disconnected_at': datetime.now(timezone.utc)
                            }}
                        )
                    elif user_type == 'user':
                        mongo.db.users.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': None,
                                'last_disconnected_at': datetime.now(timezone.utc)
                            }}
                        )
                    elif user_type == 'outlet_man':
                        mongo.db.outlet_men.update_one(
                            {'_id': user_obj_id},
                            {'$set': {
                                'socket_id': None,
                                'last_disconnected_at': datetime.now(timezone.utc)
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
        """Handle analytics data request via socket (Strictly Secured)"""
        try:
            # 1. Validation for "important data"
            auth = data.get('auth') if data else None
            token = auth.get('token') if auth else None
            
            if not token:
                print(f"[Socket Events] Analytics request denied: Token missing. SID: {request.sid}")
                # Raising ConnectionRefusedError here might disconnect the user 
                # which is a strong way to "handle the error correctly" for unauthorized access
                raise ConnectionRefusedError('Token missing')
                
            # 2. Token Verification
            try:
                decoded = decode_token(token)
                user_type = decoded.get('user_type')
                if user_type != 'master':
                    raise ValueError("Access restricted to master accounts")
            except Exception as e:
                print(f"[Socket Events] Analytics request denied: Invalid token. SID: {request.sid}")
                raise ConnectionRefusedError(f'Invalid token: {str(e)}')

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
                        'last_home_visit': datetime.now(timezone.utc)
                    }}
                )
                # Emit to all clients (for analytics dashboard)
                socketio.emit('user:home-visit', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
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
                        'last_home_leave': datetime.now(timezone.utc)
                    }}
                )
                # Emit to all clients (for analytics dashboard)
                socketio.emit('user:home-leave', {
                    'user_id': str(user['_id']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/', broadcast=True)
        except Exception as e:
            print(f"Error handling user leave home: {e}")
