# Bakery Expiry Tracker System

A full-stack web application for tracking bakery product expiry dates with authentication, dashboard, and alerts.

## Features

- User authentication (Register/Login)
- Product management (Add, Edit, Delete)
- Expiry status tracking with color coding
- Search and filter products
- Responsive design
- Toast notifications for expiring products

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** Google Cloud Firestore (Firebase Admin SDK)
- **Authentication:** JWT

## Setup Instructions

### Prerequisites

- Node.js installed
- Firebase project service account key (`backend/serviceAccountKey.json`)

### Installation

1. Clone or download the project.

2. Navigate to the backend directory:
   ```
   cd backend
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Place your Firebase service account JSON key in `backend/serviceAccountKey.json` and configure `backend/.env`:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret_key_here
   FIREBASE_PROJECT_ID=expiery-f05e4
   DEFAULT_ADMIN_PASSWORD=sujithagopal
   ```

5. Start the backend server:
   ```
   npm start
   ```
   The server will run on http://localhost:5000

6. Open the frontend by opening `frontend/index.html` in your browser.

### Usage

1. Register a new account or login with existing credentials.
2. After login, you'll be redirected to the dashboard.
3. Add products using the "Add Product" button.
4. View products in card format with expiry status.
5. Edit or delete products as needed.
6. Use search and filter to find specific products.
7. Check notifications for expiring products.

## Project Structure

```
bakery-expiry-tracker/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Product.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── products.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── styles.css
    └── script.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products (requires auth)
- `POST /api/products` - Add new product (requires auth)
- `PUT /api/products/:id` - Update product (requires auth)
- `DELETE /api/products/:id` - Delete product (requires auth)