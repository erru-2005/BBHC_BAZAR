# JWT Token-Based Authentication Guide

## ✅ Current Status

**JWT is now fully configured and implemented!**

### What's Configured:

1. ✅ **JWT Configuration** (`config.py`)
   - `JWT_SECRET_KEY` - Secret key for signing tokens
   - `JWT_ACCESS_TOKEN_EXPIRES` - Access token expires in 1 hour
   - `JWT_REFRESH_TOKEN_EXPIRES` - Refresh token expires in 30 days

2. ✅ **JWT Initialization** (`app/__init__.py`)
   - JWT Manager initialized with Flask app

3. ✅ **Token Generation** (`app/routes/auth.py`)
   - Access tokens generated on login
   - Refresh tokens generated on login
   - Tokens generated on registration

4. ✅ **Protected Routes** (`app/routes/api.py`)
   - Example protected endpoint

---

## 🔐 How It Works

### 1. **User Registration**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    ...
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 2. **User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {...},
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 3. **Using Access Token (Protected Routes)**
```http
GET /api/protected
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Response:**
```json
{
  "message": "This is a protected route",
  "user_id": "507f1f77bcf86cd799439011"
}
```

### 4. **Refresh Access Token**
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 5. **Get Current User**
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    ...
  }
}
```

---

## 📋 Available Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|----------------|-------------|
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login user |
| `/api/auth/refresh` | POST | Refresh Token | Refresh access token |
| `/api/auth/me` | GET | Access Token | Get current user |
| `/api/protected` | GET | Access Token | Example protected route |
| `/api/health` | GET | No | Health check |

---

## 🔑 Token Types

### **Access Token**
- **Lifetime:** 1 hour (configurable)
- **Use:** Authenticate API requests
- **Storage:** Frontend (localStorage, sessionStorage, or memory)
- **Sent in:** `Authorization: Bearer <token>` header

### **Refresh Token**
- **Lifetime:** 30 days (configurable)
- **Use:** Get new access tokens when expired
- **Storage:** Frontend (more secure storage recommended)
- **Sent in:** `Authorization: Bearer <token>` header

---

## 💻 Frontend Implementation Example

### React Example:

```javascript
// Login function
const login = async (email, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  return data;
};

// Make authenticated request
const fetchProtectedData = async () => {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:5000/api/protected', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};

// Refresh token function
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('http://localhost:5000/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`,
    },
  });
  
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  
  return data.access_token;
};
```

---

## 🛡️ Protecting Routes in Backend

To protect a route, use the `@jwt_required()` decorator:

```python
from flask_jwt_extended import jwt_required, get_jwt_identity

@api_bp.route('/my-protected-route', methods=['GET'])
@jwt_required()
def my_protected_route():
    # Get current user ID from token
    current_user_id = get_jwt_identity()
    
    # Your protected logic here
    return jsonify({'message': 'Protected data'}), 200
```

---

## ⚙️ Configuration

### Environment Variables (`.env`):

```env
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-in-production
SECRET_KEY=your-super-secret-key-change-in-production
```

### Token Expiration (in `config.py`):

```python
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)    # Access token
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)    # Refresh token
```

---

## 🔒 Security Best Practices

1. ✅ **Never expose JWT_SECRET_KEY** in code or version control
2. ✅ **Use HTTPS** in production
3. ✅ **Store tokens securely** in frontend (consider httpOnly cookies)
4. ✅ **Implement token refresh** before expiration
5. ✅ **Validate tokens** on every request
6. ✅ **Use strong secret keys** (at least 32 characters)
7. ✅ **Set appropriate expiration times**

---

## 🧪 Testing JWT Endpoints

### Using cURL:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","username":"testuser"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Protected route (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/protected \
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ Summary

**JWT Authentication is fully configured and ready to use!**

- ✅ Tokens generated on login/register
- ✅ Protected routes available
- ✅ Token refresh implemented
- ✅ Current user endpoint available
- ✅ Ready for frontend integration

