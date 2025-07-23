# SoulMate - MERN Matrimonial Platform (Backend)

#### [Live Link](https://soul-m-ate.vercel.app/)

This repository contains the backend server for the **SoulMate** application. It is a robust RESTful API built with Node.js, Express, and MongoDB, designed to handle all data management, user authentication, and business logic for the matrimonial platform.

## ✨ Features

- **Secure Authentication**: JWT-based authentication using Firebase Admin SDK to verify user identity and protect routes.

- **Role-Based Access Control (RBAC)**: Middleware to differentiate between regular users and administrators, restricting access to sensitive endpoints.

- **Comprehensive Biodata Management**: Full CRUD operations for user biodata, including creation, updates, and fetching detailed profiles.

- **Advanced Filtering & Pagination**: Dynamic server-side filtering for biodata listings based on age, gender, division, and search keywords, with efficient pagination.

- **User Interaction System**: Functionality for users to favourite profiles and request contact information.

- **Payment Integration**: Secure payment processing with Stripe for handling contact request fees.

- **Admin Oversight**: A suite of admin-only endpoints for managing users, approving premium requests, handling contact requests, and publishing success stories.

- **Dashboard Analytics**: Specialized endpoints to aggregate and deliver statistics for both user and admin dashboards.

## 🚀 Tech Stack

- **Runtime**: Node.js

- **Framework**: Express.js

- **Database**: MongoDB (with MongoDB Node.js Driver)

- **Authentication**: Firebase Admin SDK (for token verification)

- **Payment Gateway**: Stripe

- **Environment Management**: `dotenv`

- **Middleware**: `cors`

## ⚙️ Installation & Setup

Follow these steps to get the backend server running on your local machine.

### Prerequisites

- Node.js (v18 or later)

- npm or yarn

- A MongoDB database (local or cloud-hosted like MongoDB Atlas)

### 1. Clone the Repository

```
git clone <your-repository-url>
cd <repository-folder-name>

```

### 2. Install Dependencies

```
npm install
# or
yarn install

```

### 3. Set Up Environment Variables

Create a `.env` file in the root of your project and add the following variables.

```
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI="your_mongodb_connection_string"

# Firebase Admin SDK
# (Encode your Firebase service account JSON key to Base64)
FIREBASE_ADMIN_KEY="your_base64_encoded_firebase_service_account_key"

# Stripe Secret Key
PAYMENT_GATEWAY_KEY="sk_test_..."

# Frontend URL for CORS
CLIENT_SITE="http://localhost:5173"

```

> **Security Note**: To get your `FIREBASE_ADMIN_KEY`, you must first generate a private key JSON file from your Firebase project settings. Then, encode the entire content of that JSON file into a single Base64 string.

### 4. Run the Development Server

```
npm start
# or
yarn start

```

The server should now be running on `http://localhost:5000`.

## 📜 API Endpoints

### Public Routes

| Method | Endpoint           | Description                                        |
| ------ | ------------------ | -------------------------------------------------- |
| GET    | `/`                | Health check for the server.                       |
| GET    | `/biodatas`        | Get a paginated and filtered list of all biodatas. |
| GET    | `/biodata/premium` | Get a list of premium biodata profiles.            |
| GET    | `/success-stories` | Get a list of approved success stories.            |
| GET    | `/success-counter` | Get public statistics for the homepage counter.    |

### User Authenticated Routes (`verifyToken`)

| Method | Endpoint                              | Description                                     |
| ------ | ------------------------------------- | ----------------------------------------------- |
| GET    | `/users/info/:email`                  | Get a user's role and subscription type.        |
| GET    | `/my-profile`                         | Get the full profile of the logged-in user.     |
| GET    | `/biodata`                            | Get the biodata of the logged-in user.          |
| GET    | `/singleBiodata/:id`                  | Get details of a single biodata by its ID.      |
| GET    | `/biodata/similar/:id`                | Get biodatas similar to the specified one.      |
| GET    | `/favourites/check/:email/:biodataId` | Check if a biodata is in the user's favourites. |
| GET    | `/favourites/:email`                  | Get the user's full list of favourite biodatas. |
| GET    | `/my-contact-requests`                | Get all contact requests made by the user.      |
| GET    | `/user-dashboard-summary`             | Get aggregated stats for the user dashboard.    |
| POST   | `/users`                              | Create a new user in the database.              |
| POST   | `/biodata`                            | Create a new biodata for the logged-in user.    |
| POST   | `/favourites`                         | Add a biodata to the user's favourites.         |
| POST   | `/biodata-requests`                   | Submit a new contact information request.       |
| POST   | `/create-payment-intent`              | Create a Stripe payment intent for payments.    |
| POST   | `/success-stories`                    | Submit a new success story for review.          |
| PATCH  | `/biodata/:id`                        | Update the logged-in user's biodata.            |
| PATCH  | `/request-premium/:id`                | Request premium status for a biodata.           |
| DELETE | `/favourites`                         | Remove a biodata from the user's favourites.    |
| DELETE | `/delete-contact-requests/:id`        | Delete a contact request made by the user.      |

### Admin Only Routes (`verifyToken` & `verifyAdmin`)

| Method | Endpoint                      | Description                                    |
| ------ | ----------------------------- | ---------------------------------------------- |
| GET    | `/users`                      | Get a list of all users (searchable).          |
| GET    | `/pending-premium-biodatas`   | Get all biodatas pending premium approval.     |
| GET    | `/pending-contact-requests`   | Get all pending contact information requests.  |
| GET    | `/pending-success-stories`    | Get all success stories pending approval.      |
| GET    | `/admin-dashboard-stats`      | Get aggregated stats for the admin dashboard.  |
| PATCH  | `/users/admin/:id`            | Promote a user to the admin role.              |
| PATCH  | `/users/premium/:id`          | Upgrade a user to premium status.              |
| PATCH  | `/approve-premium/:biodataId` | Approve a pending premium biodata request.     |
| PATCH  | `/approve-contact/:id`        | Approve a pending contact information request. |
| PATCH  | `/accept-success-story/:id`   | Approve a pending success story.               |
