# Frontend Structure Overview

## 📁 Complete Folder Structure

```
Frontend/
├── src/
│   ├── components/          # ✅ Reusable UI components
│   │   ├── Button.jsx       # ✅ Button component
│   │   ├── Input.jsx        # ✅ Input component
│   │   ├── Card.jsx         # ✅ Card component
│   │   ├── Loading.jsx      # ✅ Loading spinner
│   │   └── index.js         # ✅ Barrel export
│   │
│   ├── pages/               # ✅ Page components
│   │   ├── Home.jsx         # ✅ Home page
│   │   ├── About.jsx        # ✅ About page
│   │   ├── Products.jsx     # ✅ Products page
│   │   ├── Contact.jsx      # ✅ Contact page
│   │   ├── NotFound.jsx     # ✅ 404 page
│   │   └── index.js         # ✅ Barrel export
│   │
│   ├── assets/              # Processed assets
│   │   ├── images/
│   │   ├── fonts/
│   │   └── icons/
│   │
│   ├── App.jsx              # ✅ Main app with routing
│   ├── main.jsx             # Entry point
│   ├── index.css            # Global styles
│   └── App.css              # App styles
│
├── public/                  # Static files
├── package.json
├── vite.config.js
└── index.html
```

## 🎯 Components Folder

Reusable UI components that can be used across multiple pages:

- **Button.jsx** - Reusable button with variants (primary, secondary, danger, outline)
- **Input.jsx** - Form input with validation and error handling
- **Card.jsx** - Card container component
- **Loading.jsx** - Loading spinner component
- **index.js** - Barrel export for easy imports

### Usage Example:
```jsx
import { Button, Input, Card } from '../components'
```

## 📄 Pages Folder

Page-level components that represent different routes:

- **Home.jsx** - Landing page
- **About.jsx** - About us page
- **Products.jsx** - Products listing page
- **Contact.jsx** - Contact form page
- **NotFound.jsx** - 404 error page
- **index.js** - Barrel export for easy imports

### Usage Example:
```jsx
import { Home, About, Products } from './pages'
```

## 🛣️ Routing Setup

Routes are configured in `App.jsx`:
- `/` - Home page
- `/about` - About page
- `/products` - Products page
- `/contact` - Contact page
- `*` - 404 Not Found (catch-all)

## 🎨 Styling

- Uses Tailwind CSS for styling
- Components are styled with utility classes
- Responsive design with mobile-first approach

## 📦 Component Features

### Button Component
- Variants: primary, secondary, danger, outline
- Sizes: sm, md, lg
- Disabled state support
- Type support (button, submit, reset)

### Input Component
- Label support
- Error message display
- Required field indicator
- Type support (text, email, password, etc.)

### Card Component
- Optional title
- Customizable header and body styles
- Shadow and border styling

## 🚀 Next Steps

1. Add more components as needed (Modal, Navbar, Footer, etc.)
2. Create API service layer for backend communication
3. Add state management (Context API or Redux)
4. Implement authentication flow
5. Add form validation library (react-hook-form, formik)

