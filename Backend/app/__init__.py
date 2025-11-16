"""
Flask application factory
"""
from flask import Flask, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config

# Initialize extensions
mongo = PyMongo()
cors = CORS()
jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*")


def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize MongoDB connection
    # Flask-PyMongo expects MONGO_URI, construct it from config
    mongodb_uri = app.config.get('MONGODB_URI', 'mongodb://localhost:27017/')
    mongodb_db = app.config.get('MONGODB_DB', 'bbhc_bazar')
    
    # Check if URI already includes database name (MongoDB Atlas connection strings)
    # Format: mongodb+srv://user:pass@host/database?options
    # If URI contains a path after the host (before ?), it already has the database name
    if '@' in mongodb_uri:
        # Extract the part after @ (host and path)
        after_at = mongodb_uri.split('@', 1)[1]
        # Check if there's a path component (database name) before query parameters
        if '/' in after_at.split('?')[0]:
            # URI already contains database name, use it directly
            app.config['MONGO_URI'] = mongodb_uri
        else:
            # Append database name if not present
            if not mongodb_uri.endswith('/'):
                mongodb_uri += '/'
            app.config['MONGO_URI'] = f"{mongodb_uri}{mongodb_db}"
    else:
        # Fallback for connection strings without @ (local MongoDB)
        if not mongodb_uri.endswith('/'):
            mongodb_uri += '/'
        app.config['MONGO_URI'] = f"{mongodb_uri}{mongodb_db}"
    mongo.init_app(app)
    
    # Initialize CORS with proper OPTIONS handling
    cors.init_app(app, resources={
        r"/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Initialize JWT
    jwt.init_app(app)
    
    # JWT error handlers for better error messages
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired. Please log in again.'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': f'Invalid token: {str(error)}'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing. Please log in first.'}), 401
    
    # Initialize Socket.IO
    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*'),
        async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'eventlet')
    )
    
    # Create indexes on startup
    with app.app_context():
        create_indexes()
    
    # Register blueprints
    from app.routes.api import api_bp
    from app.routes.auth import auth_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp)
    
    # Register Socket.IO events (keeping configuration but minimal)
    from app.sockets import register_socket_events
    register_socket_events(socketio)
    
    return app, socketio


def create_indexes():
    """Create database indexes for better performance"""
    try:
        from pymongo import ASCENDING
        # Create indexes for sellers collection
        mongo.db.sellers.create_index([('email', ASCENDING)], unique=True)
        mongo.db.sellers.create_index([('trade_id', ASCENDING)], unique=True)
        mongo.db.sellers.create_index([('created_at', ASCENDING)])
        
        # Create indexes for master collection
        mongo.db.master.create_index([('email', ASCENDING)], unique=True)
        mongo.db.master.create_index([('username', ASCENDING)], unique=True)
        mongo.db.master.create_index([('created_at', ASCENDING)])
        
        # Create indexes for device_tokens collection
        mongo.db.device_tokens.create_index([('user_id', ASCENDING), ('user_type', ASCENDING), ('device_id', ASCENDING)])
        mongo.db.device_tokens.create_index([('expires_at', ASCENDING)])
        mongo.db.device_tokens.create_index([('token', ASCENDING)])
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {e}")

