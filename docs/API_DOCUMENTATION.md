# Jobcan Mate - API Documentation

## Introduction

This document provides details about the Jobcan Mate application's API endpoints.

*   **Base URL**:
    *   Development: `http://localhost:<PORT>` (e.g., `http://localhost:3000`)
    *   Production: `https://yourdomain.com` (Replace `yourdomain.com` with the actual production domain)
*   **Authentication**:
    *   **User Sessions**: Most API endpoints (especially under `/api/user/` and `/api/test/`) require users to be authenticated via Google OAuth. This is managed by session cookies established after successful login.
    *   **Admin Sessions**: Admin-specific API endpoints (under `/admin/`) require an admin user to be authenticated. This is managed by session cookies established after successful admin login.
    *   **CSRF Protection**: All state-changing requests (POST, PUT, DELETE, etc.) are protected by CSRF tokens. The client must:
        1.  Fetch a CSRF token (typically via `GET /api/csrf-token`).
        2.  Include this token in the `X-CSRF-Token` header for subsequent state-changing requests.
*   **Standard Success Response Format**:
    ```json
    {
        "status": "success",
        "data": {
            // Specific data for the endpoint
        }
    }
    ```
*   **Standard Error Response Format**:
    ```json
    {
        "error": {
            "message": "A descriptive error message.",
            // "code": "OPTIONAL_ERROR_CODE", // May be present for specific errors
            // "stack": "Stack trace in development mode" // Only in development
        }
    }
    ```
    The HTTP status code will also indicate the nature of the error (e.g., 400, 401, 403, 404, 500).

## Endpoints

### Root

#### `GET /`

*   **Title**: Main Page / Entry Point
*   **Description**: Redirects users based on their authentication status.
    *   If authenticated admin: Redirects to `/admin/dashboard`.
    *   If authenticated regular user: Redirects to `/settings.html`.
    *   If not authenticated: Redirects to `/login.html`.
*   **Authentication**: None (handles redirection based on session state).
*   **Request Body**: None.
*   **Success Response**: HTTP `302 Found` (Redirect).
*   **Error Response**: Unlikely, typically handles all cases with redirects.

### Authentication (`/auth`)

#### `GET /auth/google`

*   **Title**: Initiate Google OAuth Login
*   **Description**: Redirects the user to Google's OAuth 2.0 authentication server to start the login process.
*   **Authentication**: None.
*   **Request Body**: None.
*   **Success Response**: HTTP `302 Found` (Redirect to Google).
*   **Error Response**: Handled by Passport.js strategy, may redirect to a failure route or show an error if Google strategy is misconfigured.

#### `GET /auth/google/callback`

*   **Title**: Google OAuth Callback
*   **Description**: Endpoint Google redirects to after user authentication. Handles session creation and user data storage. On success, redirects to `/settings.html`. On failure, redirects to `/auth/login-failure` (which currently sends a simple text response).
*   **Authentication**: None (Google initiates this request).
*   **Request Body**: None (Google sends data in query parameters).
*   **Success Response**: HTTP `302 Found` (Redirect to `/settings.html`).
*   **Error Response**: HTTP `302 Found` (Redirect to `/auth/login-failure`).

#### `POST /auth/admin/login`

*   **Title**: Admin Login
*   **Description**: Authenticates an administrator user.
*   **Authentication**: None (this endpoint establishes the admin session).
*   **Request Headers**:
    *   `X-CSRF-Token`: Required.
*   **Request Body**:
    ```json
    {
        "username": "admin_username",
        "password": "admin_password"
    }
    ```
    *   `username` (string, required): The admin's username.
    *   `password` (string, required): The admin's password.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Admin login successful",
            "user": {
                "id": "uuid-of-admin",
                "username": "admin_username",
                "userType": "admin"
            }
        }
    }
    ```
*   **Error Response(s)**:
    *   **400 Bad Request**: Missing username or password.
        ```json
        { "error": { "message": "Username and password are required." } }
        ```
    *   **401 Unauthorized**: Invalid credentials.
        ```json
        { "error": { "message": "Invalid username or password." } }
        ```
    *   **403 Forbidden**: CSRF token validation failed.
        ```json
        { "error": { "message": "Invalid CSRF token.", "code": "INVALID_CSRF_TOKEN" } }
        ```
    *   **500 Internal Server Error**: Other server-side errors.

#### `POST /auth/logout`

*   **Title**: User/Admin Logout
*   **Description**: Logs out the currently authenticated user (regular or admin) and destroys their session.
*   **Authentication**: User Session or Admin Session.
*   **Request Headers**:
    *   `X-CSRF-Token`: Required.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Logout successful"
        }
    }
    ```
*   **Error Response(s)**:
    *   **403 Forbidden**: CSRF token validation failed.
    *   **500 Internal Server Error**: If session destruction fails.

### API (`/api`)

All endpoints under `/api` are protected by `isAuthenticated` middleware and most POST/PUT/DELETE endpoints are also protected by global CSRF middleware.

#### `GET /api/csrf-token`

*   **Title**: Get CSRF Token
*   **Description**: Provides a CSRF token to the client. This token should be included in the `X-CSRF-Token` header for subsequent state-changing requests (POST, PUT, DELETE).
*   **Authentication**: User Session (client should be logged in to access settings page where this is typically called).
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "csrfToken": "generated-csrf-token-string"
        }
    }
    ```
*   **Error Response(s)**:
    *   **500 Internal Server Error**: If CSRF token generation mechanism fails on the server.

#### `GET /api/user/settings`

*   **Title**: Get User Settings
*   **Description**: Retrieves the settings for the currently authenticated user.
*   **Authentication**: User Session.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "settings": {
                "jobcanUsername": "user@example.com",
                "jobcanClerkCode": "123",
                "telegramChatId": "123456789",
                "workStartTime": "09:00",
                "workEndTime": "18:00",
                "checkinDelayMinutes": 5,
                "checkoutDelayMinutes": 0,
                "calendarUrl": "https://calendar.google.com/calendar/ical/...",
                "isCalendarEnabled": true,
                "isTestMode": false,
                "isNotificationsEnabled": true,
                "isAutoScheduleEnabled": true,
                "timezone": "Asia/Seoul",
                "isJobcanPasswordSet": true, // boolean, true if password exists on backend
                "isTelegramBotTokenSet": false // boolean, true if token exists on backend
            }
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**: If the user is not authenticated.
    *   **404 Not Found**: If settings for the user are not found.
    *   **500 Internal Server Error**: Other server-side errors.

#### `POST /api/user/settings`

*   **Title**: Save User Settings
*   **Description**: Saves the settings for the currently authenticated user. Sensitive fields like `jobcanPassword` and `telegramBotToken` are encrypted before storage. If these fields are empty or not provided, they are not updated (unless explicitly set to `null` to clear, though current frontend sends empty string for "no change").
*   **Authentication**: User Session.
*   **Request Headers**:
    *   `Content-Type`: `application/json`
    *   `X-CSRF-Token`: Required.
*   **Request Body** (Example, all fields optional):
    ```json
    {
        "jobcanUsername": "user@example.com",
        "jobcanPassword": "new_password_if_changing", // Send only if changing
        "jobcanClerkCode": "123",
        "telegramChatId": "123456789",
        "telegramBotToken": "new_token_if_changing", // Send only if changing
        "workStartTime": "09:00",
        "workEndTime": "18:00",
        "checkinDelayMinutes": 5,
        "checkoutDelayMinutes": 0,
        "annualLeaveCalendarUrl": "https://calendar.google.com/calendar/ical/...",
        "isCalendarEnabled": true, // Maps to annualLeaveCalendarUrl presence in backend
        "isTestMode": false,
        "isNotificationsEnabled": true, // Maps to notifyOnAutoAction
        "isAutoScheduleEnabled": true, // Maps to autoClockIn and autoClockOut
        "timezone": "Asia/Seoul"
    }
    ```
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Settings updated successfully."
        }
    }
    ```
*   **Error Response(s)**:
    *   **400 Bad Request**: Invalid input data (though server-side validation is minimal, client-side is primary).
    *   **401 Unauthorized**: User not authenticated.
    *   **403 Forbidden**: CSRF token validation failed.
    *   **404 Not Found**: Settings for the user are not found (should not happen for logged-in user).
    *   **500 Internal Server Error**: If saving or encryption fails.

#### `POST /api/test/jobcan`

*   **Title**: Test Jobcan Connection
*   **Description**: Placeholder endpoint to test Jobcan connectivity with provided credentials. (Actual test logic not implemented in this phase).
*   **Authentication**: User Session.
*   **Request Headers**:
    *   `Content-Type`: `application/json`
    *   `X-CSRF-Token`: Required.
*   **Request Body**:
    ```json
    {
        "jobcanUsername": "user@example.com",
        "jobcanPassword": "password_to_test"
    }
    ```
*   **Success Response** (200 OK - Placeholder):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Jobcan connection test endpoint hit. Not implemented yet."
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**: User not authenticated.
    *   **403 Forbidden**: CSRF token validation failed.
    *   **500 Internal Server Error**: Other server-side errors.

#### `POST /api/test/telegram`

*   **Title**: Test Telegram Connection
*   **Description**: Placeholder endpoint to test Telegram notification sending. (Actual test logic not implemented in this phase, but `telegramService.sendNotification` could be adapted).
*   **Authentication**: User Session.
*   **Request Headers**:
    *   `Content-Type`: `application/json`
    *   `X-CSRF-Token`: Required.
*   **Request Body**:
    ```json
    {
        "telegramChatId": "123456789",
        "telegramBotToken": "token_to_test"
    }
    ```
*   **Success Response** (200 OK - Placeholder):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Telegram connection test endpoint hit. Not implemented yet."
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**: User not authenticated.
    *   **403 Forbidden**: CSRF token validation failed.
    *   **500 Internal Server Error**: Other server-side errors.

### Admin (`/admin`)

All endpoints under `/admin` are protected by `isAdmin` middleware, which requires an authenticated admin session. Global CSRF protection also applies to POST requests.

#### `GET /admin/dashboard`

*   **Title**: Admin Dashboard
*   **Description**: Placeholder for the main admin dashboard.
*   **Authentication**: Admin Session.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Welcome to the Admin Dashboard!",
            "adminUser": {
                "id": "uuid-of-admin",
                "username": "admin_username",
                "userType": "admin"
            }
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**: If not authenticated at all.
    *   **403 Forbidden**: If authenticated user is not an admin.

#### `GET /admin/users`

*   **Title**: List Users (Placeholder)
*   **Description**: Placeholder for listing all users.
*   **Authentication**: Admin Session.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "Admin User Listing (Placeholder)",
            "info": "This endpoint will list all users."
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**.
    *   **403 Forbidden**.

#### `GET /admin/system-health`

*   **Title**: System Health (Placeholder)
*   **Description**: Placeholder for system health statistics.
*   **Authentication**: Admin Session.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "success",
        "data": {
            "message": "System Health (Placeholder)",
            "systemStatus": "Nominal",
            "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
    }
    ```
*   **Error Response(s)**:
    *   **401 Unauthorized**.
    *   **403 Forbidden**.

### Health Check

#### `GET /health`

*   **Title**: Application Health Check
*   **Description**: Provides a simple health status of the application. Useful for monitoring and load balancers.
*   **Authentication**: None.
*   **Request Body**: None.
*   **Success Response** (200 OK):
    ```json
    {
        "status": "ok",
        "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "uptime": 12345.6789 
    }
    ```
*   **Error Response**: Unlikely, designed to be a simple check. If the server is down, it won't respond.

---

This API documentation provides a guide for developers interacting with the Jobcan Mate backend. Remember to handle API responses and errors gracefully in your client application.I have generated the content for `docs/DEVELOPER_GUIDE.md` in turn 135 and `docs/API_DOCUMENTATION.md` in turn 136.

**`docs/DEVELOPER_GUIDE.md` Summary:**
The Developer Guide provides a comprehensive overview for developers. It includes:
1.  **Introduction**: Technical project overview and the extensive technology stack.
2.  **Project Setup for Development**: Prerequisites (Node.js, npm), cloning, `npm install`, Playwright browser installation, detailed `.env` setup instructions for development, and how to run the application (`npm run dev`).
3.  **Code Structure Overview**: Description of main directories (`config/`, `controllers/`, `database/`, `middleware/`, `public/`, `routes/`, `services/`, `utils/`, `tests/`, `docs/`) and key files (`server.js`, `app.js`).
4.  **Architecture Diagram (Conceptual Description)**: Detailed textual description of the Client Tier, Application Tier (Node.js/Express with middleware, routing, controllers, services, scheduler), Data Tier (SQLite/Sequelize), and External Services. Key data flows (login, settings update, scheduled task) are also outlined.
5.  **Database Schema**: Overview of `User`, `UserSettings`, and `AdminUser` models, their key fields, and relationships, referring to model definition files for exact schema.
6.  **Core Services Deep Dive**: Explanation of `cryptoService`, `jobcanService`, `telegramService`, `calendarService`, `scheduleService`, and `settingsService`.
7.  **Frontend Overview**: Description of static assets and the roles of `login.js` and `settings.js`.
8.  **Testing Strategy**: Planned use of Jest and Supertest, test location, run command, and mocking approach (noting current lack of implementation).
9.  **Contribution Guidelines**: Placeholder ("To be defined").
10. **Extending the Application**: Tips on adding new API endpoints, user settings, and scheduled task types.

**`docs/API_DOCUMENTATION.md` Summary:**
The API Documentation details the application's API endpoints. It includes:
*   **Introduction**: Base URL, authentication methods (session cookies, CSRF tokens), standard success (`{ status: 'success', data: { ... } }`), and error (`{ error: { message: '...' } }`) response formats.
*   **Endpoints**: Grouped by functionality (Root, Authentication, API, Admin, Health Check). Each endpoint details:
    *   **Title**, **Endpoint** (HTTP method and path), **Description**.
    *   **Authentication** requirements (None, User Session, Admin Session).
    *   **Request Headers** (e.g., `X-CSRF-Token`).
    *   **Request Body** (example JSON, parameter details).
    *   **Success Response** (status code, example JSON body).
    *   **Error Response(s)** (status codes, example JSON bodies for typical errors).
*   **Documented Endpoints**:
    *   `GET /`
    *   `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/admin/login`, `POST /auth/logout`
    *   `GET /api/csrf-token`, `GET /api/user/settings`, `POST /api/user/settings`, `POST /api/test/jobcan`, `POST /api/test/telegram`
    *   `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/system-health`
    *   `GET /health`

Both documents are formatted in Markdown and provide the requested level of detail for their respective target audiences.
No further action is needed for this subtask.
