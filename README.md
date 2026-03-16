# 🛒 BBHC BAZAR - Multi-Vendor E-Commerce Platform

A comprehensive, full-stack e-commerce ecosystem featuring a Python-based REST API, a modern React web dashboard, and a cross-platform mobile application powered by Expo.

---

## 🏗️ Project Overview

BBHC BAZAR is designed to bridge the gap between sellers, outlet managers, and customers. It provides a robust architecture for multi-role user management, real-time updates via WebSockets, and seamless integration across web and mobile platforms.

### 🌟 Key Features
- **Multi-Role System**: Dedicated workflows for **Masters (Admins)**, **Sellers**, **Outlet Men**, and **Users (Customers)**.
- **Product Management**: Hierarchical product creation with approval workflows.
- **Real-time Communication**: WebSocket integration for live product events and status updates.
- **Secure Authentication**: JWT-based security with blacklisting capabilities.
- **Scalable Backend**: Flask-based RESTful API with MongoDB as the primary data store.
- **Responsive Web**: React + Vite frontend for managing business operations.
- **Mobile Experience**: Expo (React Native) app for on-the-go access.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python, Flask, MongoDB | RESTful API, JWT Auth, WebSockets |
| **Web Frontend** | React, Vite, JavaScript | Admin & Seller Dashboard |
| **Mobile App** | React Native, Expo, TypeScript | Mobile shopping experience |
| **Database** | MongoDB | Document-oriented storage |
| **Utilities** | Socket.io, Twilio | Real-time events & SMS integration |

---

## 📁 Repository Structure

```text
BBHC_BAZAR/
├── Backend/        # Python Flask API & Database logic
├── Frontend/       # React + Vite Web Application
└── APP/            # Expo (React Native) Mobile Application
```

### 1. Backend (`/Backend`)
The core engine of the platform.
- **Framework**: Flask 3.0
- **Main Entry**: `app.py`
- **Database**: MongoDB (via PyMongo)
- **Features**: JWT Auth, Marshmallow validation, Twinlio SMS, Sockets.

### 2. Frontend (`/Frontend`)
The administrative and business interface.
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Vanilla CSS / Modules
- **State**: Context API / Store

### 3. Mobile App (`/APP`)
The customer-facing application.
- **Framework**: Expo / React Native
- **Language**: TypeScript
- **Routing**: Expo Router (file-based)

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **MongoDB** (Local or Atlas)
- **Git**

### 1. Setup Backend
```bash
cd Backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your MONGODB_URI and SECRET_KEY
python app.py
```

### 2. Setup Web Frontend
```bash
cd Frontend
npm install
npm run dev
```

### 3. Setup Mobile App
```bash
cd APP
npm install
npx expo start
```

---

## 🔐 User Roles & Permissions

- **Master (Admin)**: Full control over the system. Register sellers, manage outlets, approve products, and blacklist users.
- **Seller**: Manage their own inventory, track orders, and view analytics.
- **Outlet Man**: Field-level operations with specific access codes for order fulfillment.
- **User (Customer)**: Standard shopping experience, wishlist, and order tracking.

---

## 📡 API Endpoints (Core)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/login` | Authenticate and get JWT token |
| `POST` | `/api/register_seller` | Register a new seller (Masters only) |
| `GET` | `/api/products` | Fetch all approved products |
| `POST` | `/api/seller/products` | Submit product for approval (Sellers only) |
| `POST` | `/api/sellers/:id/blacklist` | Blacklist a specific seller |

---

## 📄 Documentation
For detailed guides on specific components, refer to:
- [Backend Structure](file:///f:/BBHC_BAZAR/Backend/STRUCTURE.md)
- [MongoDB Setup](file:///f:/BBHC_BAZAR/Backend/MONGODB_SETUP.md)
- [React Animations](file:///f:/BBHC_BAZAR/Frontend/ANIMATIONS_GUIDE.md)

---

## ⚖️ License
© 2026 BBHC BAZAR. All rights reserved.
