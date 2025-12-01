"""
Configuration settings for the Flask application
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Get the directory where this config.py file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file in the Backend directory
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=env_path)

# Debug: Print if .env file exists (only in development)
if os.path.exists(env_path):
    print(f"✓ Loading .env file from: {env_path}")
else:
    print(f"⚠ Warning: .env file not found at: {env_path}")
    print(f"  Current working directory: {os.getcwd()}")
    print(f"  Looking for .env in: {BASE_DIR}")


class Config:
    """Base configuration class"""
    
    # App Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    
    # MongoDB Configuration
    MONGODB_URI = os.environ.get('MONGODB_URI') or \
        'mongodb+srv://errualmeida2005:LPeUzlZepxpVqT5q@cluster0.czrkk.mongodb.net/BBHC-BAZAR?retryWrites=true&w=majority&appName=Cluster0'
    MONGODB_DB = os.environ.get('MONGODB_DB') or 'BBHC-BAZAR'
    MONGODB_HOST = os.environ.get('MONGODB_HOST') or 'localhost'
    MONGODB_PORT = int(os.environ.get('MONGODB_PORT', 27017))
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    
    # Socket.IO Configuration
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    SOCKETIO_ASYNC_MODE = 'threading'  # Changed from 'eventlet' for Python 3.13 compatibility
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    
    # Pagination
    POSTS_PER_PAGE = 20
    
    # Twilio SMS Configuration
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')  # Format: +1234567890
    
    # Debug: Print Twilio configuration status
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
        print(f"✓ Twilio credentials loaded successfully")
        print(f"  Account SID: {TWILIO_ACCOUNT_SID[:10]}...")
        print(f"  Phone Number: {TWILIO_PHONE_NUMBER}")
    else:
        print("⚠ Twilio credentials not fully configured:")
        print(f"  TWILIO_ACCOUNT_SID: {'✓ Set' if TWILIO_ACCOUNT_SID else '✗ Missing'}")
        print(f"  TWILIO_AUTH_TOKEN: {'✓ Set' if TWILIO_AUTH_TOKEN else '✗ Missing'}")
        print(f"  TWILIO_PHONE_NUMBER: {'✓ Set' if TWILIO_PHONE_NUMBER else '✗ Missing'}")


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MONGODB_DB = 'bbhc_bazar_test'
    WTF_CSRF_ENABLED = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

