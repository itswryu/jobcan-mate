# Jobcan Mate Web Application

**Jobcan Mate Web Application** is a Node.js-based solution designed to automate your Jobcan clock-in and clock-out processes. It offers a user-friendly web interface for managing settings, secure credential storage, and provides timely notifications via Telegram regarding automation activities.

## Features

*   **Secure User Authentication**: Login via Google OAuth 2.0.
*   **Admin Interface**: Separate login and dashboard for administrators (placeholder).
*   **Automated Jobcan Tasks**: Schedule automatic clock-in and clock-out.
    *   Customizable work times and random delay options.
*   **ICS Calendar Integration**: Automatically skips automation on leave days/holidays by parsing an ICS calendar URL (e.g., from Google Calendar).
*   **Telegram Notifications**: Receive real-time updates on:
    *   Successful clock-in/out.
    *   Errors during automation.
    *   Tasks skipped due to leave.
    *   Scheduled task setup/cancellation.
*   **Secure Credential Storage**: Sensitive data (Jobcan password, Telegram Bot Token, Google OAuth tokens) is encrypted using AES-256-GCM in the database.
*   **Test Mode**: Simulate Jobcan automation without actual clocking actions.
*   **Robust Error Handling & Logging**: Comprehensive logging using Winston and user-friendly error feedback.
*   **Production Ready**:
    *   Support for PM2 process manager (`ecosystem.config.js`).
    *   Docker support (`Dockerfile` and `.dockerignore` provided).
    *   Health check endpoint (`/health`).
    *   Configurable CORS policy.
    *   Security headers via Helmet, CSRF protection, rate limiting.

## Technology Stack

*   **Backend**: Node.js, Express.js, Sequelize (SQLite), Playwright, node-cron, Passport.js
*   **Frontend**: Static HTML, CSS, Vanilla JavaScript
*   **Security**: Helmet, CSRF-CSRF, express-rate-limit, bcrypt (for admin), AES-256-GCM (for user credentials)
*   **Deployment**: PM2, Docker
*   **Logging**: Winston, Morgan
*   **Notifications**: node-telegram-bot-api
*   **Calendar**: node-ical, axios, date-fns-tz

## Prerequisites

*   Node.js (v20.x or later recommended)
*   npm (Node.js Package Manager)
*   Git

## Quick Start (Development)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/jobcan-mate-webapp.git 
    # Replace with the actual repository URL
    cd jobcan-mate-webapp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Install Playwright browser binaries**:
    This is required for the Jobcan automation service.
    ```bash
    npx playwright install --with-deps
    ```

4.  **Setup environment variables**:
    Copy the sample file and edit it with your development settings.
    ```bash
    cp .env.sample .env
    ```
    Key variables to configure for local development:
    *   `NODE_ENV=development`
    *   `SESSION_SECRET` (generate a random string)
    *   `AES_ENCRYPTION_KEY` (generate a 64-char hex string)
    *   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    *   `GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback` (or your configured port)
    *   Refer to `.env.sample` for other variables.

5.  **Run the application in development mode**:
    This uses `nodemon` for automatic server restarts on file changes.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:3000`.

## Documentation

This project includes comprehensive documentation to help users, administrators, and developers.

*   **Installation Guide**: For detailed setup instructions for development and production environments.
    *   [View Installation Guide](./docs/INSTALLATION_GUIDE.md)
*   **User Guide**: For end-users on how to use the application's features.
    *   [View User Guide](./docs/USER_GUIDE.md)
*   **Administrator Guide**: For system administrators on deploying, managing, and monitoring the application.
    *   [View Administrator Guide](./docs/ADMIN_GUIDE.md)
*   **API Documentation**: For developers who need to understand or interact with the application's API.
    *   [View API Documentation](./docs/API_DOCUMENTATION.md)
*   **Developer Guide**: For developers contributing to or extending the application.
    *   [View Developer Guide](./docs/DEVELOPER_GUIDE.md)

## Deployment

The application is designed for production deployment using either:

*   **Docker**: A `Dockerfile` and `.dockerignore` are provided for containerization. Refer to the Installation Guide for deployment steps.
*   **PM2**: An `ecosystem.config.js` file is provided for managing the application with PM2 directly on a server.

For full deployment details, please see the [Installation Guide](./docs/INSTALLATION_GUIDE.md).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (Note: `LICENSE` file not explicitly created in this project, but MIT is a common choice).

---

Thank you for using Jobcan Mate!
