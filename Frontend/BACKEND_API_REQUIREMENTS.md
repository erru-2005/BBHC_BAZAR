# Backend API Requirements for Analytics Dashboard

This document outlines the backend API endpoints and socket events required for the Master Dashboard Analytics.

## API Endpoints

All endpoints should be prefixed with `/api/analytics/` and require master authentication.

### 1. GET `/api/analytics/stats`
Returns overall statistics.

**Response:**
```json
{
  "stats": {
    "totalUsers": 150,
    "totalSellers": 25,
    "activeUsers": 12,  // Users currently connected via socket
    "activeSellers": 5   // Sellers currently connected via socket
  }
}
```

### 2. GET `/api/analytics/active-counts`
Returns current active users and sellers (connected via socket).

**Response:**
```json
{
  "data": {
    "activeUsers": 12,
    "activeSellers": 5
  }
}
```

### 3. GET `/api/analytics/sales-by-category`
Returns sales grouped by category.

**Query Parameters:**
- `period`: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
- `category`: (optional) filter by specific category
- `startDate`: (optional) ISO date string
- `endDate`: (optional) ISO date string

**Response:**
```json
{
  "data": [
    { "name": "Electronics", "value": 50000 },
    { "name": "Clothing", "value": 30000 },
    { "name": "Food", "value": 20000 }
  ]
}
```

### 4. GET `/api/analytics/sales-trend`
Returns sales trend over time.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "date": "2024-01-01", "sales": 10000 },
    { "date": "2024-01-02", "sales": 15000 },
    { "date": "2024-01-03", "sales": 12000 }
  ]
}
```

### 5. GET `/api/analytics/orders-by-status`
Returns count of orders grouped by status.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "status": "pending", "count": 10 },
    { "status": "confirmed", "count": 25 },
    { "status": "processing", "count": 15 },
    { "status": "shipped", "count": 8 },
    { "status": "delivered", "count": 50 },
    { "status": "cancelled", "count": 5 }
  ]
}
```

### 6. GET `/api/analytics/revenue-vs-commissions`
Returns revenue and commissions over time.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "date": "2024-01-01", "revenue": 10000, "commissions": 1000 },
    { "date": "2024-01-02", "revenue": 15000, "commissions": 1500 }
  ]
}
```

### 7. GET `/api/analytics/customer-growth`
Returns new customer registrations over time.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "month": "2024-01", "newCustomers": 50, "totalCustomers": 500 },
    { "month": "2024-02", "newCustomers": 75, "totalCustomers": 575 }
  ]
}
```

### 8. GET `/api/analytics/returning-vs-new`
Returns breakdown of returning vs new customers.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": {
    "newCustomers": 200,
    "returningCustomers": 350
  }
}
```

### 9. GET `/api/analytics/stock-levels`
Returns product stock levels (sorted by lowest first).

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "name": "Product A", "stock": 0 },
    { "name": "Product B", "stock": 5 },
    { "name": "Product C", "stock": 10 }
  ]
}
```

### 10. GET `/api/analytics/top-products`
Returns top products by sales.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "name": "Product A", "sales": 50000, "orders": 100 },
    { "name": "Product B", "sales": 40000, "orders": 80 }
  ]
}
```

### 11. GET `/api/analytics/sales-by-seller`
Returns sales grouped by seller.

**Query Parameters:** Same as above

**Response:**
```json
{
  "data": [
    { "name": "Seller A", "sales": 50000, "orders": 100 },
    { "name": "Seller B", "sales": 40000, "orders": 80 }
  ]
}
```

## Socket.IO Events

### Server → Client Events

#### `user:connected`
Emitted when a user connects to the socket.

**Payload:**
```json
{
  "userId": "user123",
  "userType": "user"
}
```

#### `user:disconnected`
Emitted when a user disconnects from the socket.

**Payload:**
```json
{
  "userId": "user123",
  "userType": "user"
}
```

#### `seller:connected`
Emitted when a seller connects to the socket.

**Payload:**
```json
{
  "sellerId": "seller123",
  "userType": "seller"
}
```

#### `seller:disconnected`
Emitted when a seller disconnects from the socket.

**Payload:**
```json
{
  "sellerId": "seller123",
  "userType": "seller"
}
```

#### `analytics:stats-update`
Emitted when analytics stats are updated.

**Payload:**
```json
{
  "stats": {
    "totalUsers": 150,
    "activeUsers": 12,
    "totalSellers": 25,
    "activeSellers": 5
  }
}
```

#### `analytics:update`
Emitted when any analytics data is updated.

**Payload:**
```json
{
  "stats": { ... },
  "salesByCategory": [ ... ],
  "ordersByStatus": [ ... ],
  "stockLevels": [ ... ],
  "topProducts": [ ... ]
}
```

### Client → Server Events

#### `analytics:get-active-counts`
Request current active user and seller counts.

**Response (via callback):**
```json
{
  "activeUsers": 12,
  "activeSellers": 5
}
```

## Implementation Notes

1. **Active Users/Sellers Tracking:**
   - Track users/sellers connected via Socket.IO
   - When a user/seller connects, emit `user:connected` or `seller:connected`
   - When they disconnect, emit `user:disconnected` or `seller:disconnected`
   - Maintain a count of currently connected users/sellers
   - Return this count in `/api/analytics/active-counts` endpoint

2. **Data Format:**
   - All dates should be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
   - All monetary values should be in the smallest currency unit (e.g., paise for INR)
   - Status values should match the order status enum used in your system

3. **Filtering:**
   - Support filtering by date range (startDate, endDate)
   - Support filtering by category
   - Support different time periods (daily, weekly, monthly, yearly)

4. **Performance:**
   - Consider caching frequently accessed analytics data
   - Use database indexes on date and status fields
   - Implement pagination for large datasets if needed

5. **Error Handling:**
   - Return 404 if endpoint doesn't exist (frontend will use fallback)
   - Return 401 if user is not authenticated
   - Return 403 if user is not a master
   - Return appropriate error messages in error responses

