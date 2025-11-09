"""
Authentication tests
"""
import pytest
from app import create_app, mongo
from app.services.user_service import UserService


@pytest.fixture
def app():
    """Create test app"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['MONGODB_DB'] = 'bbhc_bazar_test'
    app.config['MONGODB_URI'] = 'mongodb://localhost:27017/'
    
    with app.app_context():
        # Clear test database
        mongo.db.users.drop()
        yield app
        # Cleanup after tests
        mongo.db.users.drop()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'


def test_register_user(client):
    """Test user registration"""
    user_data = {
        'email': 'test@example.com',
        'password': 'Test1234!',
        'username': 'testuser',
        'first_name': 'Test',
        'last_name': 'User'
    }
    response = client.post('/api/auth/register', json=user_data)
    assert response.status_code == 201
    assert 'user' in response.json
    assert response.json['user']['email'] == user_data['email']


def test_register_duplicate_email(client):
    """Test registration with duplicate email"""
    user_data = {
        'email': 'test@example.com',
        'password': 'Test1234!',
        'username': 'testuser'
    }
    # Register first user
    client.post('/api/auth/register', json=user_data)
    # Try to register again with same email
    response = client.post('/api/auth/register', json=user_data)
    assert response.status_code == 409

