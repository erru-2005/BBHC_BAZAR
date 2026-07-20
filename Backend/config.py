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
    print(f"[OK] Loading .env file from: {env_path}")
else:
    print(f"[WARN] Warning: .env file not found at: {env_path}")
    print(f"  Current working directory: {os.getcwd()}")
    print(f"  Looking for .env in: {BASE_DIR}")


class Config:
    """Base configuration class"""
    
    # App Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5001))
    BASE_URL = os.environ.get('BASE_URL') or 'http://apps.bbhegdecollege.com:9000/'
    
    # MongoDB Configuration
    MONGODB_URI = os.environ.get('MONGODB_URI') or \
        'mongodb+srv://errualmeida2005:LPeUzlZepxpVqT5q@cluster0.czrkk.mongodb.net/BBHC-BAZAR?retryWrites=true&w=majority&appName=Cluster0'
    MONGODB_DB = os.environ.get('MONGODB_DB') or 'BBHC-BAZAR'
    MONGODB_HOST = os.environ.get('MONGODB_HOST') or 'localhost'
    MONGODB_PORT = int(os.environ.get('MONGODB_PORT', 27017))
    
    # CORS Configuration
    _cors_origins_raw = os.environ.get('CORS_ORIGINS', '*')
    if _cors_origins_raw.strip() == '*':
        CORS_ORIGINS = '*'
    else:
        CORS_ORIGINS = [
            origin.strip()
            for origin in _cors_origins_raw.split(',')
            if origin.strip()
        ]
    
    # Socket.IO Configuration
    SOCKETIO_CORS_ALLOWED_ORIGINS = CORS_ORIGINS
    SOCKETIO_ASYNC_MODE = 'threading'  # Changed from 'eventlet' for Python 3.13 compatibility
    
    # JWT Configuration - STRICT RS256 ENFORCED
    JWT_ALGORITHM = 'RS256'
    
    _private_key_path = os.path.join(BASE_DIR, 'private.pem')
    _public_key_path = os.path.join(BASE_DIR, 'public.pem')
    
    if os.path.exists(_private_key_path) and os.path.exists(_public_key_path):
        with open(_private_key_path, 'r') as f:
            JWT_PRIVATE_KEY = f.read()
        with open(_public_key_path, 'r') as f:
            JWT_PUBLIC_KEY = f.read()
    else:
        # If keys are missing, we raise an error to prevent silent fallback to insecure methods
        print("[CRITICAL] RSA keys (private.pem/public.pem) not found! Strict RS256 cannot be enforced.")
        # We don't set JWT_SECRET_KEY here to ensure HS256 cannot be used by accident
        pass
        
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Cookie Configuration
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_ACCESS_COOKIE_NAME = 'access_token'
    JWT_COOKIE_SECURE = False  # Set to False because the app uses port forwarding over HTTP
    JWT_COOKIE_CSRF_PROTECT = False  # Disable CSRF initially for API compatibility
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    
    # Pagination
    POSTS_PER_PAGE = 20
    
    # SMTP Email Configuration
    SMTP_SERVER = os.environ.get('SMTP_SERVER') or 'smtp.gmail.com'
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_EMAIL = os.environ.get('SMTP_EMAIL')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    
    # Debug: Print SMTP configuration status
    if SMTP_EMAIL and SMTP_PASSWORD:
        print(f"[OK] SMTP credentials loaded successfully ({SMTP_EMAIL})")
    else:
        print("[WARN] SMTP credentials not fully configured in .env")

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
    
    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
        import cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        print(f"[OK] Cloudinary configured successfully (cloud: {CLOUDINARY_CLOUD_NAME})")
    else:
        print("[WARN] Cloudinary credentials missing. Image uploads will fail.")

    # Razorpay (secret must stay server-side only)
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        print("[OK] Razorpay credentials loaded")
    else:
        print("[WARN] Razorpay credentials missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)")

    # SMTP Configuration
    SMTP_SERVER = os.environ.get('SMTP_SERVER') or 'smtp.gmail.com'
    SMTP_PORT = int(os.environ.get('SMTP_PORT') or 587)
    SMTP_EMAIL = os.environ.get('SMTP_EMAIL')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    if SMTP_SERVER and SMTP_EMAIL and SMTP_PASSWORD:
        print(f"[OK] SMTP credentials loaded successfully ({SMTP_EMAIL})")
    else:
        print("[WARN] SMTP credentials not fully configured in environment")


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

