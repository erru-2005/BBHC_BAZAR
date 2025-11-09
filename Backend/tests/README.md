# Tests Folder - Quick Guide

## What is this folder?

The `tests/` folder contains **automated tests** that verify your backend code works correctly.

## Is it required?

**Short answer: No, but highly recommended!**

- ❌ Your app will run without tests
- ✅ Tests help catch bugs before users find them
- ✅ Tests ensure code changes don't break existing features
- ✅ Professional projects always include tests

## What's inside?

### `test_auth.py`
Tests for authentication endpoints:
- ✅ Health check endpoint works
- ✅ User registration works correctly
- ✅ Duplicate email registration is prevented

## How to run tests?

```bash
# Install pytest if not already installed
pip install pytest pytest-flask

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app
```

## Example Test

```python
def test_register_user(client):
    """Test user registration"""
    user_data = {
        'email': 'test@example.com',
        'password': 'Test1234!',
        'username': 'testuser'
    }
    response = client.post('/api/auth/register', json=user_data)
    assert response.status_code == 201  # Should succeed
    assert 'user' in response.json
```

## When to write tests?

- ✅ Before deploying to production
- ✅ When fixing bugs (write test first, then fix)
- ✅ When adding new features
- ✅ Before refactoring code

## Can I delete this folder?

**Yes, but don't!** 

- Your app will still work
- But you'll lose the ability to automatically verify your code
- Not recommended for production applications

## Best Practice

Keep tests updated as you add new features. Tests are like a safety net for your code!

