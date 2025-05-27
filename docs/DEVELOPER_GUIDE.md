# Jobcan Mate - Developer Guide

## 1. Introduction

### Project Overview (Technical)

Jobcan Mate is a Node.js web application designed to automate Jobcan (a popular Japanese HR/attendance system) clock-in/out operations. It provides a user interface for configuring automation settings, managing credentials securely, and receiving notifications. The backend handles user authentication, settings storage, scheduled task execution using Playwright for browser automation, and notifications via Telegram.

### Technology Stack

*   **Backend**:
    *   **Runtime**: Node.js (v20.x recommended)
    *   **Framework**: Express.js
    *   **Database**: SQLite with Sequelize ORM
    *   **Browser Automation**: Playwright
    *   **Scheduling**: `node-cron`
    *   **Calendar Parsing**: `node-ical`, `axios`, `date-fns-tz`
    *   **Notifications**: `node-telegram-bot-api`
    *   **Authentication**: Passport.js (Google OAuth 2.0 strategy), custom admin authentication
    *   **Security**: `csrf-csrf` (CSRF protection), `helmet` (security headers), `express-rate-limit` (rate limiting)
    *   **HTTP Compression**: `compression`
    *   **Logging**: Winston
    *   **Process Management**: PM2
*   **Frontend**:
    *   Static HTML
    *   CSS (vanilla)
    *   JavaScript (vanilla)
*   **Deployment**:
    *   Docker (optional, `Dockerfile` provided)

## 2. Project Setup for Development

### Prerequisites

*   Node.js (Version 20.x or later is recommended)
*   npm (Node Package Manager, typically comes with Node.js)
*   Git

### Cloning the Repository

```bash
git clone <repository_url>
cd jobcan-mate-webapp # Or your repository directory name
```

### Installation

Install project dependencies:

```bash
npm install
```

### Install Playwright Browsers

Playwright requires browser binaries to be installed.

```bash
npx playwright install --with-deps
```
This command downloads the necessary browser binaries (Chromium, Firefox, WebKit) along with their dependencies.

### Environment Variables

1.  Copy the sample environment file:
    ```bash
    cp .env.sample .env
    ```
2.  Edit the `.env` file and configure essential development values:
    *   **`NODE_ENV`**: Set to `development`.
    *   **`SESSION_SECRET`**: Generate a long, random string. Example: `openssl rand -base64 32`
    *   **`AES_ENCRYPTION_KEY`**: Generate a 64-character hex string (32 bytes). Example: `openssl rand -hex 32`
    *   **Google OAuth Credentials (for Google Login)**:
        *   `GOOGLE_CLIENT_ID`: Your Google Cloud Console project's OAuth 2.0 Client ID.
        *   `GOOGLE_CLIENT_SECRET`: Your Google Cloud Console project's OAuth 2.0 Client Secret.
        *   `GOOGLE_CALLBACK_URL`: Typically `http://localhost:3000/auth/google/callback` for local development. Ensure this exact URL is added to your "Authorized redirect URIs" in the Google Cloud Console.
    *   **`SQLITE_STORAGE_PATH`**: Defaults to `app_database.sqlite` in the project root. You can change this if needed.
    *   **Admin User (Optional for Dev)**:
        *   `DEFAULT_ADMIN_USERNAME`: (e.g., "admin")
        *   `DEFAULT_ADMIN_PASSWORD`: (e.g., "devpassword")
    *   Other variables can usually be left as their defaults for local development.

### Running the Application

To run the application in development mode (with `nodemon` for automatic restarts on file changes):

```bash
npm run dev
```
This script typically runs `NODE_ENV=development nodemon server.js`. If `nodemon` is not installed globally, you might need to install it (`npm install -g nodemon`) or run `npx nodemon server.js`.

Alternatively, for a simple start without `nodemon`:
```bash
npm start
```
This will run `node server.js`.

### Accessing the Application

Once the server is running, you can access the application at:
`http://localhost:<PORT>` (e.g., `http://localhost:3000` if `PORT` is 3000).

## 3. Code Structure Overview

*   `config/`: Contains application-wide configuration files.
    *   `config.js`: Loads environment variables and provides configuration objects for various services (database, Google OAuth, Jobcan, Playwright, Calendar, CORS).
    *   `passport-setup.js`: Configures Passport.js strategies, specifically Google OAuth 2.0, including user serialization/deserialization and database interaction.
    *   `telegram_messages.json`: Message templates for Telegram notifications (i18n support).
*   `controllers/`: Express.js route handlers (controllers in MVC terms).
    *   `apiController.js`: Handles requests for API endpoints (e.g., user settings, CSRF token).
    *   `authController.js`: Handles authentication-related requests (e.g., admin login, logout).
*   `database/`: Manages database interactions.
    *   `models/`: Contains Sequelize model definitions (`User.js`, `UserSettings.js`, `AdminUser.js`).
    *   `setup.js`: Initializes Sequelize, defines model associations, and includes database synchronization logic and initial admin user seeding.
*   `docs/`: Project documentation files (like this guide).
*   `middleware/`: Custom Express.js middleware.
    *   `authMiddleware.js`: Provides `isAuthenticated` and `isAdmin` middleware for route protection.
*   `public/`: Static frontend assets.
    *   `css/`: Stylesheets (`login.css`, `settings.css`).
    *   `js/`: Client-side JavaScript (`login.js`, `settings.js`).
    *   `login.html`, `settings.html`: Main HTML pages.
*   `routes/`: Defines Express.js routes.
    *   `adminRoutes.js`: Routes for administrator-specific functionalities (e.g., `/admin/dashboard`).
    *   `apiRoutes.js`: Routes for the application's API (e.g., `/api/user/settings`).
    *   `authRoutes.js`: Routes for authentication (e.g., Google login, admin login, logout).
*   `services/`: Contains core business logic and interactions with external services or complex internal operations.
    *   `calendarService.js`: Handles fetching and parsing ICS calendar data for leave detection.
    *   `cryptoService.js`: Provides AES encryption/decryption for sensitive data.
    *   `jobcanService.js`: Manages browser automation for Jobcan using Playwright.
    *   `scheduleService.js`: Handles scheduling and execution of automated tasks using `node-cron`.
    *   `settingsService.js`: Manages updates to user settings, especially sensitive, encrypted fields.
    *   `telegramService.js`: Sends notifications via Telegram.
    *   `userService.js`, `adminService.js`: (Currently stubs) Intended for user/admin management logic.
*   `utils/`: Utility modules.
    *   `logger.js`: Configures the Winston logger for application-wide logging.
*   `tests/`: (Placeholder) Intended for Jest test files (unit, integration). Currently not implemented.
*   `pm2_logs/`: (Gitignored) Default directory for PM2 logs if PM2 is used locally.
*   `logs/`: (Gitignored) Default directory for Winston file transport logs.

### Key Files

*   `server.js`: The main entry point of the application. Initializes the database, scheduler, and starts the Express server.
*   `app.js`: Configures the Express application, including middleware (security, session, CSRF, logging, compression), static file serving, and route mounting.
*   `ecosystem.config.js`: PM2 process manager configuration file for production deployments.
*   `Dockerfile`: For building the application as a Docker container.
*   `.env.sample`: Sample environment variable file.

## 4. Architecture Diagram (Conceptual Description)

Jobcan Mate follows a layered web application architecture:

*   **Client Tier (Browser)**:
    *   Users interact with static HTML pages (`login.html`, `settings.html`) served from the `public/` directory.
    *   Client-side JavaScript (`login.js`, `settings.js`) handles UI interactions, form submissions, and API calls to the backend.

*   **Application Tier (Node.js/Express.js Backend)**:
    *   **Entry Point**: `server.js` initializes the server.
    *   **Express App Setup (`app.js`)**:
        *   Requests are processed through a stack of middleware:
            *   Logging (Morgan)
            *   Compression
            *   Security (Helmet, CORS)
            *   Rate Limiting
            *   Body Parsing (JSON, URL-encoded)
            *   Session Management (`express-session`)
            *   Passport.js (Authentication)
            *   CSRF Protection (`csrf-csrf`)
        *   Static files are served from `public/`.
        *   The `/health` and `/` routes are defined.
    *   **Routing (`routes/`)**:
        *   Defined routes (`/auth`, `/admin`, `/api`) map incoming requests to specific controller functions.
        *   Middleware (`isAuthenticated`, `isAdmin`) protects routes.
    *   **Controllers (`controllers/`)**:
        *   Receive requests from routes.
        *   Perform basic request validation.
        *   Orchestrate operations by calling appropriate service modules.
        *   Format and send HTTP responses (JSON or redirects).
    *   **Services (`services/`)**:
        *   Encapsulate the core business logic.
        *   `jobcanService`: Uses Playwright to interact with the Jobcan website for clock-in/out.
        *   `telegramService`: Formats messages (i18n) and sends them via the Telegram Bot API.
        *   `calendarService`: Fetches ICS calendar data, parses it, and determines leave days.
        *   `scheduleService`: Uses `node-cron` to schedule and manage automated Jobcan tasks based on user settings and calendar data.
        *   `cryptoService`: Provides AES encryption and decryption for sensitive data (e.g., API keys, Jobcan passwords).
        *   `settingsService`: Handles logic related to updating user settings, especially those requiring encryption.
        *   Services interact with the database via Sequelize models.
    *   **Background Scheduler (`scheduleService`)**:
        *   Operates independently, triggering Jobcan tasks at scheduled times.

*   **Data Tier**:
    *   **Database**: SQLite database file (e.g., `app_database.sqlite`).
    *   **ORM**: Sequelize manages database schema (`database/models/`) and queries.
    *   **Data Storage**: User accounts, encrypted credentials, application settings, session data (potentially, though default is memory store for `express-session` unless configured otherwise).

*   **External Services**:
    *   **Google**: For OAuth 2.0 user authentication and potentially fetching ICS calendar data.
    *   **Jobcan**: The target website for browser automation.
    *   **Telegram Bot API**: For sending notifications.

### Key Data Flows:

*   **User Login (Google OAuth)**:
    1.  User clicks "Login with Google" button (frontend).
    2.  Redirects to `/auth/google` (backend).
    3.  Passport.js redirects to Google's OAuth server.
    4.  User authenticates with Google.
    5.  Google redirects back to `/auth/google/callback` (backend).
    6.  Passport.js strategy in `config/passport-setup.js` handles the callback:
        *   Finds or creates a `User` in the database.
        *   Encrypts and stores OAuth tokens.
        *   Creates `UserSettings` if new user.
        *   Establishes a session.
    7.  Redirects to `/settings.html`.
*   **Settings Update**:
    1.  User modifies settings on `settings.html` (frontend).
    2.  Client-side JS fetches CSRF token from `/api/csrf-token`.
    3.  User clicks "Save Settings".
    4.  Client-side JS sends a POST request to `/api/user/settings` with settings data and CSRF token.
    5.  `apiController.saveUserSettings` handles the request:
        *   Calls `settingsService.updateSensitiveUserSettings` for fields requiring encryption.
        *   Updates other fields directly on the `UserSettings` model.
        *   Calls `scheduleService.updateUserSchedule` if schedule-related settings changed.
        *   Returns a success/error JSON response.
*   **Scheduled Jobcan Task**:
    1.  `scheduleService` triggers a cron job (e.g., for check-in).
    2.  Job function retrieves `UserSettings` for the relevant user.
    3.  Checks `calendarService.checkIfUserOnLeave`. If on leave, sends notification and skips.
    4.  Otherwise, calls `jobcanService.executeJobcanTask` with user ID and action type.
    5.  `jobcanService` decrypts Jobcan credentials, uses Playwright to perform the task, and returns a result.
    6.  `scheduleService` sends a success or error notification via `telegramService`.

## 5. Database Schema

The application uses Sequelize to manage the database schema. Model definitions are located in `database/models/`.

*   **`User` Model (`User.js`)**:
    *   `id`: UUID, primary key.
    *   `googleId`: String, unique, from Google OAuth.
    *   `email`: String, unique, user's email.
    *   `displayName`, `firstName`, `familyName`, `profilePictureUrl`, `locale`: User profile information from Google.
    *   `salt`: String, user-specific salt for encrypting tokens.
    *   `encryptedGoogleAccessToken`, `encryptedGoogleRefreshToken`: TEXT, encrypted OAuth tokens.
    *   `lastLoginAt`: DATE, timestamp of the last login.
    *   `isVerified`: BOOLEAN, email verification status from Google.
    *   Timestamps: `createdAt`, `updatedAt`.
*   **`UserSettings` Model (`UserSettings.js`)**:
    *   `id`: UUID, primary key.
    *   `userId`: UUID, foreign key linking to `User` model (one-to-one).
    *   `jobcanUsername`: String, user's Jobcan login ID.
    *   `jobcanPasswordSalt`: String, salt for Jobcan password.
    *   `encryptedJobcanPassword`: TEXT, encrypted Jobcan password.
    *   `jobcanClerkCode`: String, optional Jobcan ADIT/clerk code.
    *   `telegramChatId`: String, user's Telegram Chat ID for notifications.
    *   `telegramBotTokenSalt`: String, salt for Telegram bot token.
    *   `encryptedTelegramBotToken`: TEXT, encrypted user's Telegram bot token.
    *   `workStartTime`, `workEndTime`: TIME, preferred clock-in/out times.
    *   `checkinDelayMinutes`, `checkoutDelayMinutes`: INTEGER, delay for clock-in/out.
    *   `autoClockIn`, `autoClockOut`: BOOLEAN, flags to enable/disable automated actions.
    *   `notifyOnAutoAction`: BOOLEAN, flag to enable/disable Telegram notifications for automated actions.
    *   `annualLeaveCalendarUrl`: STRING, URL for the ICS calendar.
    *   `isCalendarEnabled`: (Implicitly handled by presence of `annualLeaveCalendarUrl` and user actions, but frontend shows a checkbox).
    *   `isTestMode`: BOOLEAN, if true, Jobcan actions are simulated.
    *   `timezone`: STRING, user's preferred IANA timezone.
    *   `languagePreference`: STRING (e.g., 'ko', 'en'), user's preferred language for notifications (Note: This field was planned but might not be explicitly in the model yet; `telegramService` defaults to 'ko').
    *   Timestamps: `createdAt`, `updatedAt`.
*   **`AdminUser` Model (`AdminUser.js`)**:
    *   `id`: UUID, primary key.
    *   `username`: String, unique, admin's username.
    *   `hashedPassword`: String, bcrypt-hashed admin password.
    *   Timestamps: `createdAt`, `updatedAt`.

### Relationships

*   A `User` has one `UserSettings` (`User.hasOne(UserSettings)`).
*   `UserSettings` belongs to one `User` (`UserSettings.belongsTo(User)`). The `userId` in `UserSettings` is the foreign key.

For the exact and most up-to-date schema, please refer to the model definition files in `database/models/`.

## 6. Core Services Deep Dive

*   **`cryptoService.js`**:
    *   Handles AES-256-GCM encryption and decryption of sensitive data.
    *   Uses a master encryption key (`AES_ENCRYPTION_KEY`) from environment variables.
    *   Requires a unique salt for each encryption operation.
    *   Provides `encrypt(plaintextString, saltHex)` and `decrypt(encryptedString, saltHex)`.
    *   Includes `generateSalt()` to create cryptographically strong salts.
*   **`jobcanService.js`**:
    *   Orchestrates browser automation tasks for Jobcan using Playwright.
    *   `executeJobcanTask(userId, actionType)` is the main public function.
    *   Internal functions:
        *   `loginToJobcan()`: Handles navigation to login page, filling credentials (decrypted by `executeJobcanTask`), and submitting the form. Waits for a login success indicator.
        *   `performCheckIn()` / `performCheckOut()`: Click the respective buttons on the Jobcan stamp page and wait for a success indicator.
    *   Includes error handling, screenshot generation on error, and browser cleanup.
    *   Respects `isTestMode` from user settings.
*   **`telegramService.js`**:
    *   Responsible for sending notifications to users via their own Telegram bots.
    *   `sendNotification(userId, messageKey, params)` is the main public function.
    *   Loads message templates from `config/telegram_messages.json` (supports i18n 'ko'/'en').
    *   `getFormattedMessage()`: Selects the correct language template and interpolates parameters.
    *   Fetches user's `telegramChatId` and decrypted `telegramBotToken` from `UserSettings`.
    *   Initializes `TelegramBot` instance and sends the message.
*   **`calendarService.js`**:
    *   `checkIfUserOnLeave(userId, targetDate)` is the main public function.
    *   Fetches ICS calendar data from a URL specified in `UserSettings.annualLeaveCalendarUrl`.
    *   Uses `axios` for fetching and `node-ical` for parsing ICS data.
    *   Implements caching for fetched/parsed calendar data to reduce external requests (`calendarCache`, `CACHE_TTL_MS`).
    *   `isDateOnLeave()`:
        *   Checks events against the `targetDate` in the user's specified `timezone`.
        *   Uses `LEAVE_KEYWORDS_ARRAY` from config to identify leave-related events.
        *   Handles all-day events and timed events, including basic recurrence rules (`rrule.between()`).
        *   Uses `date-fns-tz` for accurate timezone conversions and date comparisons.
*   **`scheduleService.js`**:
    *   Manages scheduled Jobcan tasks using `node-cron`.
    *   `initScheduler()`: Called on application startup to load schedules for all relevant users from the database.
    *   `updateUserSchedule(userId)`: Called when user settings change to update or create cron jobs for that user.
    *   `scheduleUserTasks(userId)`:
        *   Clears existing jobs for the user (`unscheduleUserTasks`).
        *   Fetches `UserSettings`.
        *   If auto-clock-in/out is enabled and times are set, creates two `CronJob` instances (one for check-in, one for check-out) based on `workStartTime`, `workEndTime`, and delay settings.
        *   Cron jobs run Monday-Friday in the user's specified timezone.
        *   The job function calls `calendarService.checkIfUserOnLeave`. If on leave, it skips the Jobcan task and sends a notification.
        *   Otherwise, it calls `jobcanService.executeJobcanTask` and sends success/error notifications via `telegramService`.
    *   `calculateCronValues()`: Helper to determine cron-compatible hour/minute from time string and delay.
    *   `activeUserSchedules`: A `Map` to keep track of active cron jobs for users.
*   **`settingsService.js`**:
    *   `updateSensitiveUserSettings(userId, { jobcanPassword, telegramBotToken })`:
        *   Specifically handles updating fields that require encryption (`jobcanPassword`, `telegramBotToken`).
        *   Retrieves `UserSettings`.
        *   If a new password/token is provided, generates a new salt (if one doesn't exist for that field) and encrypts the value using `cryptoService.encrypt`.
        *   Saves the encrypted value and its salt.
        *   Allows clearing of these fields if `null` or an empty string is passed.

## 7. Frontend Overview

The frontend is built with static HTML, CSS, and vanilla JavaScript, served from the `public/` directory.

*   **`public/login.html` & `public/js/login.js`**:
    *   Provides the user login interface.
    *   `login.js` handles:
        *   Redirection to `/auth/google` on "Login with Google" button click.
        *   Basic internationalization (i18n) for text content (Korean/English), with language preference stored in `localStorage`.
*   **`public/settings.html` & `public/js/settings.js`**:
    *   The main interface for users to manage their settings after logging in.
    *   Features a tabbed layout for different setting categories.
    *   `settings.js` handles:
        *   **Tab Navigation**: Switching between different setting tabs.
        *   **CSRF Token Management**: Fetches a CSRF token from `/api/csrf-token` on page load (`initCsrfToken`) and includes it in `X-CSRF-Token` header for POST requests.
        *   **Loading Settings**: On page load, fetches user settings from `/api/user/settings` and populates the form fields. Handles display of placeholders for sensitive fields (e.g., "********" for passwords if set).
        *   **Saving Settings**: On form submission, collects data, performs client-side validation (`validateSettingsForm`), and sends it to `/api/user/settings` via a POST request. Password fields are only sent if the user types into them.
        *   **Test Connections**: Buttons for "Jobcan 연결 테스트" and "Telegram 연결 테스트" send POST requests to `/api/test/jobcan` and `/api/test/telegram` respectively, including necessary data and the CSRF token.
        *   **Logout**: The logout button sends a POST request to `/auth/logout` with the CSRF token and redirects to `login.html` on success.
        *   **Notifications**: Uses a simple `showNotification` function to display success/error/info messages to the user.
        *   **Loading Indicator**: Shows a loading indicator during API calls.
        *   **Client-Side Validation**: `validateSettingsForm()` performs basic checks (e.g., URL format, numeric IDs, required fields if auto-schedule is on).

## 8. Testing Strategy

*   **Frameworks**: (Planned, not fully implemented)
    *   Jest: For unit tests (testing individual functions/modules) and integration tests (testing interactions between modules).
    *   Supertest: For API endpoint testing (making HTTP requests to the application and asserting responses).
*   **Location**: Test files should be located in the `tests/` directory, typically mirroring the structure of the code being tested (e.g., `tests/services/cryptoService.test.js`).
*   **Running Tests**:
    ```bash
    npm test
    ```
    (This script currently echoes "Error: no test specified" and needs to be updated to run Jest).
*   **Mocking**:
    *   External services (Playwright browser interactions, Google API, Telegram API, ICS URL fetching) should be mocked for tests to ensure reliability and avoid external dependencies. Jest's mocking capabilities (`jest.mock`, `jest.spyOn`) can be used.
    *   Database interactions (Sequelize) can be mocked or an in-memory SQLite database can be used for testing.

**Current Status**: The testing infrastructure (Jest setup, sample tests) is not yet implemented in this phase of the project. This is a key area for future development.

## 9. Contribution Guidelines

To be defined. For now, follow existing code patterns and ensure clear, commented code.

## 10. Extending the Application

### Adding a New API Endpoint

1.  **Define the Route**: Add the new route definition in the appropriate file in `routes/` (e.g., `apiRoutes.js` for general API, `adminRoutes.js` for admin-specific).
    ```javascript
    // Example in routes/apiRoutes.js
    router.post('/new-feature', isAuthenticated, apiController.handleNewFeature);
    ```
2.  **Create Controller Function**: Implement the handler function in the corresponding controller file in `controllers/` (e.g., `apiController.js`).
    ```javascript
    // Example in controllers/apiController.js
    exports.handleNewFeature = async (req, res, next) => {
        try {
            // ... logic involving services ...
            res.status(200).json({ status: 'success', data: { message: 'New feature processed!' } });
        } catch (error) {
            logger.error('Error in new feature:', error);
            next(error); // Pass to global error handler
        }
    };
    ```
3.  **Implement Service Logic (if needed)**: If the endpoint requires complex business logic or data manipulation, create or update a service function in `services/`.
4.  **Add Frontend Interaction (if applicable)**: Update client-side JavaScript in `public/js/` to call the new endpoint.
5.  **Documentation**: Update `API_DOCUMENTATION.md`.

### Adding a New User Setting

1.  **Database Model**: Add the new field to `database/models/UserSettings.js`.
    *   Remember that `sequelize.sync()` in development will attempt to update the schema. For production, a migration strategy would be needed.
2.  **Frontend (`settings.html`, `settings.js`)**:
    *   Add the new input field(s) to the appropriate tab in `public/settings.html`.
    *   Update `public/js/settings.js`:
        *   In `loadUserSettings()`: Populate the new field from the data received from `/api/user/settings`.
        *   In the `settingsForm` submit listener: Include the new field's value in the `settingsData` object sent to the backend.
        *   Add any necessary client-side validation in `validateSettingsForm()`.
3.  **Backend (`apiController.js`)**:
    *   In `getUserSettings()`: Include the new setting in the `responseSettings` object.
    *   In `saveUserSettings()`:
        *   Handle the new field from `req.body`.
        *   If it's sensitive, update `services/settingsService.js` to handle its encryption/decryption.
        *   Otherwise, add it to the `nonSensitiveFields` array or handle it directly for saving.
        *   Consider if changes to this setting should trigger `updateUserSchedule()`.
4.  **Backend (`config/config.js`, `.env.sample`)**: If the setting is configurable via environment variables (e.g., a default value), update these files.

### Adding a New Scheduled Task Type

1.  **Define Task Logic**: Create a new function in an appropriate service (or a new service file) that encapsulates the logic for this task (similar to `jobcanService.executeJobcanTask`).
2.  **`scheduleService.js`**:
    *   Modify `scheduleUserTasks()`:
        *   Add logic to check if this new task type is enabled in `UserSettings`.
        *   If enabled, calculate its cron time.
        *   Create a new `CronJob` instance for it.
        *   The cron job's function should call your new task logic and handle notifications.
    *   Update `unscheduleUserTasks()` to stop this new job type.
    *   Add the new job to `activeUserSchedules`.
3.  **`UserSettings` Model**: Add any necessary fields to `UserSettings.js` to control this new task (e.g., enable flag, time settings).
4.  **Frontend & API**: Update `settings.html`, `settings.js`, and `apiController.js` to allow users to configure this new task.
5.  **Telegram Notifications**: Add new message templates to `config/telegram_messages.json` for this task.

---

This guide provides a starting point for developers. For more detailed information, refer to the source code and specific module documentation.Okay, I have generated the content for `docs/DEVELOPER_GUIDE.md`.

Now, I'll create `docs/API_DOCUMENTATION.md`.
