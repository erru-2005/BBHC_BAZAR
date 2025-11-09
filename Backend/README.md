# Backend API - Flask Application

A scalable Flask backend application for BBHC Bazar.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB:**
```bash
# If using local MongoDB, make sure it's running
# On Windows: MongoDB should start automatically as a service
# On Linux/Mac: sudo systemctl start mongod
# Or use: mongod

# For MongoDB Atlas, use the connection string in .env file
```

5. **Verify MongoDB connection:**
```bash
# The app will automatically create indexes on startup
# Check MongoDB is accessible at mongodb://localhost:27017
```

6. **Run the application:**
```bash
python app.py
# Or
flask run
```

The API will be available at `http://127.0.0.1:5000`

## 📁 Project Structure

```
Backend/
├── app.py                 # Application entry point
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── README.md             # This file
│
├── app/                   # Main application package
│   ├── __init__.py       # App factory and initialization
│   ├── models/           # Database models
│   │   ├── __init__.py
│   │   └── user.py
│   ├── routes/           # API routes/blueprints
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── api.py
│   ├── services/         # Business logic layer
│   │   ├── __init__.py
│   │   └── user_service.py
│   ├── utils/            # Utility functions
│   │   ├── __init__.py
│   │   ├── validators.py
│   │   └── helpers.py
│   └── schemas/          # Marshmallow schemas
│       ├── __init__.py
│       └── user_schema.py
│
├── tests/                # Test files
│   ├── __init__.py
│   └── test_auth.py
│
└── instance/            # Instance-specific files (config)
```

## 🔧 Configuration

Edit `config.py` or set environment variables in `.env` file.

## 🧪 Testing

```bash
pytest
```

## 📝 API Documentation

API endpoints will be documented here or use tools like Swagger/Flask-RESTX.

## 🔒 Security Notes

- Never commit `.env` file
- Change `SECRET_KEY` in production
- Use strong passwords for database
- Enable HTTPS in production

