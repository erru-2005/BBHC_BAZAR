"""
Flask application factory
"""
from flask import Flask
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
    # Ensure URI ends with database name
    if not mongodb_uri.endswith('/'):
        mongodb_uri += '/'
    app.config['MONGO_URI'] = f"{mongodb_uri}{mongodb_db}"
    mongo.init_app(app)
    
    # Initialize CORS
    cors.init_app(app, resources={
        r"/*": {
            "origins": app.config['CORS_ORIGINS']
        }
    })
    
    # Initialize JWT
    jwt.init_app(app)
    
    # Initialize Socket.IO
    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*'),
        async_mode=app.config.get('SOCKETIO_ASYNC_MODE', 'eventlet')
    )
    
    # Create indexes on startup
    with app.app_context():
        create_indexes()
    
    # Register blueprints - only root route
    from app.routes.api import api_bp
    
    app.register_blueprint(api_bp)
    
    # Register Socket.IO events (keeping configuration but minimal)
    from app.sockets import register_socket_events
    register_socket_events(socketio)
    
    return app, socketio


def create_indexes():
    """Create database indexes for better performance"""
    try:
        from pymongo import ASCENDING
        # Create indexes for users collection
        mongo.db.users.create_index([('email', ASCENDING)], unique=True)
        mongo.db.users.create_index([('username', ASCENDING)], unique=True)
        mongo.db.users.create_index([('created_at', ASCENDING)])
        
        # Create indexes for master collection
        mongo.db.master.create_index([('email', ASCENDING)], unique=True)
        mongo.db.master.create_index([('username', ASCENDING)], unique=True)
        mongo.db.master.create_index([('created_at', ASCENDING)])
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {e}")

