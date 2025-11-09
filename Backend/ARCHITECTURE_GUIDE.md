# Backend Architecture Guide

## 📁 Folder Structure Explained

### 1. **`tests/` Folder**

**What is it?**
- Contains automated tests to verify your code works correctly
- Uses `pytest` framework for testing

**Is it required?**
- ❌ **Not required** for the app to run
- ✅ **Highly recommended** for production applications
- ✅ **Best practice** for maintaining code quality

**What does it contain?**
- `test_auth.py` - Tests for authentication endpoints (register, login)
- Tests verify:
  - API endpoints return correct responses
  - User registration works
  - Duplicate email handling
  - Error cases

**How to run tests:**
```bash
pytest
# or
pytest tests/test_auth.py
```

**Benefits:**
- Catch bugs before deployment
- Ensure code changes don't break existing features
- Document expected behavior
- Enable safe refactoring

---

## 🏗️ Folder Purposes

### 2. **`routes/` Folder** ⭐ **RECEIVES FIRST**

**Purpose:** Define API endpoints (URLs) that clients can call

**What it does:**
- Defines the API endpoints (e.g., `/api/auth/register`, `/api/auth/login`)
- Handles HTTP requests (GET, POST, PUT, DELETE)
- Validates incoming data
- Calls services to perform business logic
- Returns JSON responses

**Example:**
```python
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()  # Get data from frontend
    # Validate data
    # Call service
    # Return response
```

**Files:**
- `auth.py` - Authentication routes (register, login)
- `api.py` - General API routes (health check)

---

### 3. **`services/` Folder**

**Purpose:** Contains business logic (the "what to do" part)

**What it does:**
- Implements the actual business operations
- Interacts with the database through models
- Contains reusable business logic
- Handles complex operations

**Example:**
```python
class UserService:
    @staticmethod
    def create_user(user_data):
        # Hash password
        # Create user object
        # Save to database
        # Return user
```

**Files:**
- `user_service.py` - User-related business logic

**Why separate from routes?**
- Keeps routes clean and focused
- Allows reuse of business logic
- Easier to test
- Better organization

---

### 4. **`models/` Folder**

**Purpose:** Defines data structures (how data looks)

**What it does:**
- Defines the structure of your data (User, Product, etc.)
- Contains methods to work with data
- Converts between Python objects and database documents
- Handles data validation at the model level

**Example:**
```python
class User:
    def __init__(self, username, email, ...):
        self.username = username
        self.email = email
    
    def to_dict(self):
        # Convert to dictionary for JSON response
    
    def check_password(self, password):
        # Verify password
```

**Files:**
- `user.py` - User model definition

**Why needed?**
- Provides structure for your data
- Encapsulates data-related methods
- Makes code more maintainable

---

### 5. **`schemas/` Folder**

**Purpose:** Data validation and serialization (format conversion)

**What it does:**
- Validates incoming data structure
- Converts data between formats (dict ↔ object)
- Ensures data meets requirements
- Uses Marshmallow library

**Example:**
```python
class UserSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=Length(min=8))
```

**Files:**
- `user_schema.py` - User data validation schemas

**Why needed?**
- Ensures data integrity
- Validates before processing
- Standardizes data format
- Prevents invalid data from entering system

**Note:** Currently not heavily used in your code, but useful for complex validation

---

### 6. **`utils/` Folder**

**Purpose:** Helper functions and utilities (reusable code)

**What it does:**
- Contains helper functions used across the application
- Provides common utilities
- Not specific to any feature

**Files:**
- `validators.py` - Validation functions (email, password, phone)
- `helpers.py` - Helper functions (success/error responses)

**Example:**
```python
def validate_email(email):
    # Check if email format is valid
    return True/False

def success_response(data, message):
    # Create standardized success response
```

**Why needed?**
- Avoids code duplication
- Centralizes common functions
- Makes code more maintainable

---

## 🔄 API Request Flow (Step by Step)

When a frontend makes an API call, here's the **exact order** of execution:

### Example: User Registration Flow

```
Frontend (React)
    ↓
    POST /api/auth/register
    { email: "user@example.com", password: "pass123" }
    ↓
┌─────────────────────────────────────────────────────────┐
│ 1. ROUTES (routes/auth.py) ⭐ RECEIVES FIRST           │
│    - Receives HTTP request                              │
│    - Extracts JSON data from request                    │
│    - Validates basic requirements (data exists)          │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. UTILS (utils/validators.py)                         │
│    - validate_email() - Check email format             │
│    - validate_password() - Check password strength      │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. SERVICES (services/user_service.py)                │
│    - get_user_by_email() - Check if user exists         │
│    - create_user() - Business logic:                     │
│      • Hash password                                    │
│      • Create User object                               │
│      • Save to database                                 │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. MODELS (models/user.py)                             │
│    - User class - Data structure                        │
│    - set_password() - Hash password method              │
│    - to_bson() - Convert to MongoDB format             │
│    - to_dict() - Convert to JSON format                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 5. DATABASE (MongoDB)                                  │
│    - Stores the user document                          │
│    - Returns inserted document                         │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 6. MODELS (models/user.py)                             │
│    - from_bson() - Convert from MongoDB to User object │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 7. SERVICES (services/user_service.py)                 │
│    - Returns User object to route                      │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 8. ROUTES (routes/auth.py)                             │
│    - Converts User to dictionary (to_dict())          │
│    - Creates JSON response                             │
│    - Returns to frontend                               │
└─────────────────────────────────────────────────────────┘
    ↓
Frontend (React)
    Receives: { message: "User created", user: {...} }
```

---

## 📊 Visual Flow Diagram

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ HTTP Request
       │ POST /api/auth/register
       ↓
┌──────────────────────────────────────┐
│  1️⃣ ROUTES (routes/auth.py)         │ ⭐ FIRST
│  - Receives request                 │
│  - Extracts data                    │
│  - Basic validation                 │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  2️⃣ UTILS (utils/validators.py)     │
│  - validate_email()                 │
│  - validate_password()              │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  3️⃣ SERVICES (services/...)        │
│  - Business logic                    │
│  - Calls models                      │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  4️⃣ MODELS (models/user.py)        │
│  - Data structure                    │
│  - Data methods                      │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  5️⃣ DATABASE (MongoDB)              │
│  - Stores/retrieves data             │
└──────────────────────────────────────┘
       ↓
       │ (Reverse flow)
       ↓
┌──────────────────────────────────────┐
│  6️⃣ ROUTES (routes/auth.py)        │
│  - Creates response                  │
│  - Returns JSON                     │
└──────────────────────────────────────┘
       ↓
┌─────────────┐
│   Frontend  │
│   (React)   │
└─────────────┘
```

---

## 🎯 Key Takeaways

1. **Routes receive requests FIRST** ⭐
   - They are the entry point for all API calls

2. **Separation of Concerns:**
   - **Routes** = HTTP handling
   - **Services** = Business logic
   - **Models** = Data structure
   - **Utils** = Helper functions
   - **Schemas** = Validation

3. **Request Flow:**
   ```
   Routes → Utils → Services → Models → Database
   ```

4. **Response Flow:**
   ```
   Database → Models → Services → Routes → Frontend
   ```

5. **Tests are optional** but highly recommended for production

---

## 💡 Why This Structure?

**Benefits:**
- ✅ **Maintainable** - Easy to find and update code
- ✅ **Testable** - Each layer can be tested independently
- ✅ **Scalable** - Easy to add new features
- ✅ **Reusable** - Services and utils can be reused
- ✅ **Clean** - Each folder has a clear purpose

**Example:**
If you need to change how passwords are hashed, you only modify `models/user.py`, not the entire codebase!

