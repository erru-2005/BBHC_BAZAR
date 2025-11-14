# Sample Data for API Endpoints

## Master Registration (`POST /api/register_master`)

### Required Fields:
- `name` (string): Full name of the master
- `username` (string): Unique username
- `email` (string): Valid email address
- `password` (string): Password for the account
- `phone_number` (string): Phone number

### Optional Fields:
- `address` (string): Physical address
- `status` (string): Account status - must be 'active' or 'not_active' (default: 'active')
- `created_by` (string): Creator identifier (default: 'bazar@bbhc')

### Sample JSON Request:

```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "phone_number": "+1234567890",
  "address": "123 Main Street, City, State 12345",
  "status": "active"
}
```

### Sample JSON Request (Minimal):

```json
{
  "name": "Jane Smith",
  "username": "janesmith",
  "email": "jane.smith@example.com",
  "password": "MyPassword456!",
  "phone_number": "+9876543210"
}
```

---

## Seller Registration (`POST /api/register_seller`)

### Required Fields:
- `username` (string): Unique username
- `email` (string): Valid email address
- `password` (string): Password for the account

### Optional Fields:
- `first_name` (string): First name
- `last_name` (string): Last name
- `is_active` (boolean): Account active status (default: true)
- `is_admin` (boolean): Admin privileges (default: false)

### Sample JSON Request:

```json
{
  "username": "sellersmith",
  "email": "seller.smith@example.com",
  "password": "SellerPass789!",
  "first_name": "Seller",
  "last_name": "Smith",
  "is_active": true,
  "is_admin": false
}
```

### Sample JSON Request (Minimal):

```json
{
  "username": "sellerjoe",
  "email": "seller.joe@example.com",
  "password": "SellerPassword123!"
}
```

---

## Sample cURL Commands

### Register Master:
```bash
curl -X POST http://localhost:5000/api/register_master \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "phone_number": "+1234567890",
    "address": "123 Main Street, City, State 12345",
    "status": "active"
  }'
```

### Register Seller:
```bash
curl -X POST http://localhost:5000/api/register_seller \
  -H "Content-Type: application/json" \
  -d '{
    "username": "sellersmith",
    "email": "seller.smith@example.com",
    "password": "SellerPass789!",
    "first_name": "Seller",
    "last_name": "Smith",
    "is_active": true
  }'
```

---

## Response Format

### Success Response (201 Created):
```json
{
  "message": "Master registered successfully",
  "master": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "address": "123 Main Street, City, State 12345",
    "status": "active",
    "created_by": "bazar@bbhc",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request):
```json
{
  "error": "Email and password are required"
}
```

### Error Response (409 Conflict - Duplicate):
```json
{
  "error": "Master with this email already exists"
}
```

