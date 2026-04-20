# 🌐 Singleton WebSocket Architecture

This document outlines the roles and real-time functionality provided by the unified WebSocket singleton across the **BBHC Bazaar** ecosystem.

## 🏢 The 4 Modules & WebSocket Utility

The application uses a **Singleton Socket Manager** that ensures a single, stable connection per browser session. This connection manages role-specific events to keep the UI alive without redundant polling.

---

### 1. 👤 User (Customer)
The user module relies on WebSockets for a seamless shopping experience.
*   **Real-time Order Updates**: Instant notification when a seller accepts, rejects, or readies an order for pickup.
*   **Live Stock Status**: Receives updates if a product in their bag or wishlist becomes unavailable or changes price.
*   **Active Presence**: Contributes to the "Active Users" counter monitored by the Master dashboard.
*   **Guest Mode**: Allows unauthorized users to receive public broadcast events (like system-wide notices) before logging in.

### 2. 🏪 Seller (Vendor)
For sellers, real-time connectivity is critical for operational speed.
*   **Instant Order Alerts**: A push notification (and Redux update) fires immediately when a user places a new order.
*   **Dashboard Sync**: Seller analytics and order lists update in real-time without manual page refreshes.
*   **Online Presence**: Monitors the seller's active status in the database to show customers which shops are currently "Open" for orders.

### 3. 👑 Master (Admin)
The Master module uses the socket for global system oversight and rapid management.
*   **Active Counter Management**: Real-time monitoring of active `Users`, `Sellers`, `Masters`, and `Outlets` across the entire platform.
*   **Approval Queues**: Instant notification when a new seller registers or a new product is submitted for approval.
*   **System-wide Broadcasts**: The ability to send alerts or maintenance notices to all connected sockets.
*   **Active Registry**: Tracks the unique Socket IDs for all connected administrators for internal auditing.

### 4. 📦 Outlet (Delivery/Pickup)
The Outlet module bridges the gap between digital orders and physical handover.
*   **Pickup Synchronization**: When a seller marks an order as "Ready for Pickup," the Outlet dashboard updates instantly.
*   **Handover Confirmation**: Real-time status changes when an order is scanned and handed over to the customer.
*   **Queue Management**: Keeps the physical counter staff informed of incoming pickup requests in real-time.

---

## 🚀 Key Benefits of Singleton Architecture

1.  **State Consistency**: By centralizing the socket in `App.jsx`, we ensure that Redux state and Socket events are always in sync.
2.  **Resource Efficiency**: Prevents "Socket Leakage" where multiple hidden connections drain server memory and browser performance.
3.  **Secure Handshake**: The singleton automatically handles the transition from an **Unauthorized (Guest)** connection to an **Authorized (JWT)** connection upon login.
4.  **Auto-Recovery**: Built-in reconnection logic with exponential backoff ensures that if the backend restarts, all dashboards reconnect without user intervention.
