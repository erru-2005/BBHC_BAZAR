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

## 🏠 Homepage Showcase Plan (Products + Services)

The home page should act as a **curated discovery feed** — not a full catalog. Users browse a small, high-quality selection and tap through to dedicated **Products** and **Services** listing pages for everything else.

### Design principles

| Principle | Why |
| :--- | :--- |
| **Curate, don’t dump** | Showing every approved item slows the page, hurts mobile UX, and hides what matters. |
| **Products and services are peers** | Services are not a single card wedged inside a product grid; they get their own visible blocks. |
| **Fixed limits per section** | Each block has a max count so layout stays predictable on all screen sizes. |
| **One clear exit per type** | Every section ends with **See all products** or **See all services**. |
| **Master-controlled + smart fallback** | Admins can pin featured items; anything not pinned is filled automatically by rules. |

### Current state (today)

| Area | Behaviour |
| :--- | :--- |
| `SpotlightSlider` | Static slides from Redux — not tied to real products/services. |
| `RecommendationRow` | Titles exist in `dataSlice`, but no product/service data is attached (rows stay hidden). |
| `ProductShowcase` | Renders **all** products from `GET /api/products`. |
| Services on home | Only **one** service card is injected after the 4th product (`index === 3` in `ProductShowcase`). |

This plan replaces that ad-hoc mix with a deliberate structure.

---

### Recommended page structure (top → bottom)

```
┌─────────────────────────────────────────────┐
│  1. HERO SPOTLIGHT (3–5 slides)             │  ← mixed: featured product OR service
├─────────────────────────────────────────────┤
│  2. QUICK ENTRY STRIP                       │  ← Products · Services · Trending · New
├─────────────────────────────────────────────┤
│  3. FEATURED SERVICES (horizontal, 4–6)     │  ← dedicated service row
├─────────────────────────────────────────────┤
│  4. TRENDING PRODUCTS (horizontal, 8–10)    │  ← horizontal scroll cards
├─────────────────────────────────────────────┤
│  5. MIXED PICKS GRID (max 12 items)         │  ← 2 products : 1 service pattern
├─────────────────────────────────────────────┤
│  6. FRESH THIS WEEK (6–8 items)             │  ← newest approved, mixed types
├─────────────────────────────────────────────┤
│  7. BROWSE ALL CTAs                         │  ← full catalog links
└─────────────────────────────────────────────┘
```

**Total items on home (target):** ~35–45 cards maximum across all sections (not thousands).

---

### Section details

#### 1. Hero Spotlight (3–5 slides)

- **Content:** Master-pinned items first, then auto-fill from top-rated / recently approved.
- **Mix rule:** At least **1 service slide** when services exist (e.g. 2 products + 1 service in a 3-slide set).
- **Each slide:** image, title, short subtitle, price or “from ₹X”, CTA → product detail or service detail.
- **Do not show:** entire inventory — cap at 5 slides.

#### 2. Quick entry strip

- Short chips: **Products**, **Services**, **Trending**, **New arrivals**.
- Links to `/products`, `/services`, and filtered collection routes.
- No product cards here — navigation only.

#### 3. Featured services (horizontal row)

- **Heading:** e.g. “Book a Professional” / “Services near you”.
- **Count:** 4 on mobile (scroll), 6 on desktop.
- **Card:** thumbnail, service name, category, price (`total_service_charge`), “Book →”.
- **Selection:** `is_featured = true` → else highest rating → else most bookings → else newest.
- **Footer:** `See all services →` → `/services`.

#### 4. Trending products (horizontal row)

- **Heading:** e.g. “Trending now”.
- **Count:** 8–10 items (horizontal scroll).
- **Selection:** featured → order volume (last 30 days) → rating → recency.
- **Footer:** `See all products →` → `/products`.

#### 5. Mixed picks grid (compact, space-efficient)

- **Count:** 12 items max (e.g. 4 rows × 3 cols on desktop, 2 cols on mobile).
- **Pattern:** interleave types so services are always visible:

```
[ Product ] [ Product ] [ Service* ]
[ Product ] [ Product ] [ Service* ]
[ Product ] [ Product ] [ Service* ]
[ Product ] [ Product ] [ Service* ]
```

- **Service cards** span same grid cell size as products (no oversized `col-span-2` break).
- Avoid duplicate IDs across sections (if a service is in row 3, don’t repeat in row 5).

#### 6. Fresh this week

- **Count:** 6–8 items total; split ~60% products / ~40% services when both exist.
- **Selection:** `approved_at` or `created_at` within last 7 days.
- If fewer than 6 new items, backfill from trending (don’t leave empty).

#### 7. Browse-all CTAs

- Two clear buttons/cards at the bottom of the feed:
  - **Explore all products**
  - **Explore all services**
- Full lists live only on listing pages, not on home.

---

### Selection rules (when Master has not pinned items)

**Products candidate pool**

1. Status = approved, seller active, not blacklisted.
2. Score (example):  
   `score = (featured ? 1000 : 0) + (orders_30d × 2) + (avg_rating × 10) + recency_bonus`
3. **Diversity:** max 2 products from the same category per section.
4. **Per-section cap** as defined above.

**Services candidate pool**

1. Status = approved / live, seller has accepted service credit terms if required.
2. Score (example):  
   `score = (featured ? 1000 : 0) + (bookings_30d × 2) + (avg_rating × 10) + recency_bonus`
3. **Diversity:** max 1 service per category in the mixed grid row.
4. **Per-section cap** as defined above.

**Global de-duplication**

- Track `usedIds` while building sections top → bottom.
- An item appears in **at most one** section (except Hero may reuse a single “hero” pick if needed).

---

### API & data model (planned)

#### Option A — Single feed endpoint (recommended)

```
GET /api/home/feed
```

Response shape:

```json
{
  "hero": [{ "type": "product|service", "id": "...", "title": "...", "image": "...", "price": 0, "link": "..." }],
  "featuredServices": [{ "id": "...", "service_name": "...", "thumbnail": "...", "total_service_charge": 0 }],
  "trendingProducts": [{ "id": "...", "product_name": "...", "thumbnail": "...", "total_selling_price": 0 }],
  "mixedPicks": [{ "type": "product|service", "..." : "..." }],
  "freshThisWeek": [{ "type": "product|service", "..." : "..." }],
  "meta": { "totalProducts": 120, "totalServices": 18 }
}
```

Backend builds the feed once per request (or cached 5 min) using the rules above.

#### Option B — Feature flags on existing documents

Add to `products` and `services` collections:

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `is_featured` | boolean | Pin to hero / priority pools |
| `featured_order` | number | Sort among featured items |
| `home_sections` | string[] | e.g. `["hero", "trending"]` — optional explicit placement |
| `approved_at` | datetime | For “Fresh this week” |

Frontend calls existing list endpoints with query params:  
`GET /api/products?home_feed=trending&limit=10`  
`GET /api/services?home_feed=featured&limit=6`

#### Master admin UI (future)

- **Homepage curation** screen under Master dashboard:
  - Pin/unpin products & services to Hero, Trending, Featured Services.
  - Drag to reorder `featured_order`.
  - Preview counts per section (never exceed caps).

---

### Frontend implementation map

| File / area | Change |
| :--- | :--- |
| `Home.jsx` | Stop passing full `products` / `services` arrays to one grid; render section components from `homeFeed` state. |
| `dataSlice.js` | Replace static `spotlightProducts` / empty `recommendationRows` with `homeFeed` from API. |
| `ProductShowcase.jsx` | Split into `FeaturedServicesRow`, `TrendingProductsRow`, `MixedPicksGrid` (or keep one orchestrator). |
| `SpotlightSlider.jsx` | Accept real hero items (`type` + `link` + dynamic image). |
| `RecommendationRow.jsx` | Reuse for horizontal product/service rows with `type` prop. |

**Mobile**

- Horizontal sections: `overflow-x-auto`, `snap-x`, 2.2 cards visible to hint scroll.
- Mixed grid: `grid-cols-2`, consistent card height, `line-clamp` on titles.
- Bottom nav unchanged; home remains scrollable feed.

---

### What we deliberately do **not** show on home

- Full product catalog (use `/products`).
- Full service catalog (use `/services`).
- Unapproved, draft, or blacklisted seller items.
- Duplicate cards across multiple sections.
- More than **~45** total cards combined.

---

### Rollout phases

| Phase | Scope |
| :--- | :--- |
| **Phase 1** | Frontend-only: slice existing `getProducts()` / `getServices()` client-side with limits + interleaving (quick win). |
| **Phase 2** | `GET /api/home/feed` + Mongo scoring + 5-minute cache. |
| **Phase 3** | Master curation UI (`is_featured`, drag order, section assignment). |
| **Phase 4** | Personalization (wishlist category, past orders) for “Inspired for you” row. |

---

### Success criteria

- Home loads fast with a bounded number of items.
- Services are visible in **at least two** dedicated areas (hero or featured row + mixed grid).
- Users always know where to find the full catalog (CTAs).
- Layout is stable on mobile (no broken grids when there is only 1 image or 1 service).
- Masters can override auto-selection without code changes (Phase 3).

---

## 📄 Documentation
For detailed guides on specific components, refer to:
- [Backend Structure](file:///f:/BBHC_BAZAR/Backend/STRUCTURE.md)
- [MongoDB Setup](file:///f:/BBHC_BAZAR/Backend/MONGODB_SETUP.md)
- [React Animations](file:///f:/BBHC_BAZAR/Frontend/ANIMATIONS_GUIDE.md)

---

## ⚖️ License
© 2026 BBHC BAZAR. All rights reserved.
