# Matrimony Platform - Server

The backend API for the Matrimony Platform, built with Node.js, Express, and MongoDB. This server handles user authentication, data management, payment processing, and real-time communication.

## 🚀 Features

-   **RESTful API**: Comprehensive API endpoints for users, biodatas, favourites, and requests.
-   **Authentication**: Secure authentication using Firebase Admin SDK and JWT.
-   **Role-Based Access Control**: Middleware to verify users and admins (`verifyToken`, `verifyAdmin`).
-   **Database**: MongoDB with Mongoose for efficient data storage and retrieval.
-   **Real-time Messaging**: Socket.io integration for instant chat between users.
-   **Payment Processing**: Stripe integration for handling premium membership payments.
-   **Biodata Management**: CRUD operations for user biodatas with advanced search and filtering.
-   **Dashboard Statistics**: Aggregated data for user and admin dashboards.

## 🛠️ Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express.js](https://expressjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/)
-   **ODM**: [Mongoose](https://mongoosejs.com/)
-   **Authentication**: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
-   **Real-time Communication**: [Socket.io](https://socket.io/)
-   **Payments**: [Stripe](https://stripe.com/)
-   **Utilities**: `dotenv`, `cors`, `cookie-parser`, `jsonwebtoken`.

## 📦 Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd server
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Setup:**

    Create a `.env` file in the root directory and add the following variables:

    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    PAYMENT_GATEWAY_KEY=your_stripe_secret_key
    FIREBASE_ADMIN_KEY=your_base64_encoded_firebase_service_account_json
    ACCESS_TOKEN_SECRET=your_jwt_secret_key
    ```

    *Note: `FIREBASE_ADMIN_KEY` should be a Base64 encoded string of your Firebase service account JSON file.*

## 🏃‍♂️ Running the Server

Start the server in development mode (with nodemon):

```bash
npm run dev
```

Start the server in production mode:

```bash
npm start
```

The server will run on `http://localhost:5000` (or the port specified in `.env`).

## 🔗 API Endpoints

### Authentication
-   `POST /jwt`: Generate JWT token.
-   `POST /logout`: Clear auth cookie.

### Users
-   `POST /users`: Create a new user.
-   `GET /users`: Get all users (Admin only).
-   `GET /users/info/:email`: Get user role and subscription status.
-   `GET /my-profile`: Get current user's profile.

### Biodata
-   `POST /biodata`: Create a new biodata.
-   `GET /biodata`: Get user's biodata.
-   `GET /biodatas`: Search and filter biodatas.
-   `GET /singleBiodata/:id`: Get a specific biodata.
-   `GET /biodata/premium`: Get premium biodatas.
-   `GET /biodata/similar/:id`: Get similar biodatas.

### Favourites
-   `POST /favourites`: Add to favourites.
-   `GET /favourites/:email`: Get user's favourites.
-   `DELETE /favourites/:id`: Remove from favourites.

### Admin
-   `GET /admin-dashboard-stats`: Get admin dashboard statistics.
-   `GET /pending-premium-biodatas`: Get pending premium requests.
-   `GET /pending-contact-requests`: Get pending contact requests.
-   `PATCH /users/admin/:id`: Make a user admin.
-   `PATCH /biodata/premium/:id`: Approve premium request.

### Success Stories
-   `GET /success-stories`: Get success stories.
-   `POST /success-stories`: Submit a success story.

## 📂 Project Structure

```
server/
├── index.js            # Main entry point
├── package.json        # Dependencies and scripts
├── .env                # Environment variables
└── ...                 # Other configuration files
```
