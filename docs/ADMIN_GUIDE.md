# Jobcan Mate - Administrator Guide

## 1. Introduction

**Welcome, Administrator!**

This guide is intended for system administrators responsible for deploying, configuring, maintaining, and monitoring the Jobcan Mate application. It provides essential information to ensure the smooth and secure operation of the service.

**Admin Responsibilities Overview:**

*   **Deployment**: Setting up the application in a suitable production environment.
*   **Configuration**: Managing environment variables and application settings.
*   **Maintenance**: Performing updates, backups, and managing dependencies.
*   **Monitoring**: Tracking application health, logs, and performance.

## 2. System Installation & Setup

### 2.1. Prerequisites

Before deploying Jobcan Mate, ensure your environment meets the following prerequisites:

*   **Node.js** (Version 20.x or later recommended)
*   **NPM** (Typically comes with Node.js)
*   **Process Manager**: PM2 is recommended for Node.js applications.
*   **Reverse Proxy**: Nginx or Apache is highly recommended for SSL termination, serving static files, and load balancing (if applicable).
*   **Docker** (Optional): If deploying using Docker containers.

### 2.2. Installation

For detailed installation steps, please refer to the `INSTALLATION_GUIDE.md` (Note: This document is assumed to exist; if not, create it or incorporate steps here).

### 2.3. Post-Installation Checks

After installation and starting the application:

1.  **Application Status**:
    *   If using PM2: Run `pm2 list` to ensure the `jobcan-mate-webapp` process is online.
    *   If using Docker: Run `docker ps` to check if the container is running.
2.  **Health Check**: Access the `GET /health` endpoint (e.g., `http://yourdomain.com/health` or `http://localhost:PORT/health`). It should return a JSON response with `status: 'ok'`.
3.  **Initial Logs**: Check the initial application logs for any startup errors:
    *   PM2: `pm2 logs jobcan-mate-webapp`
    *   Winston logs: `logs/combined.log` and `logs/error.log`
    *   Docker: `docker logs <container_name_or_id>`

## 3. Environment Configuration

Jobcan Mate relies on environment variables for its configuration. These are typically managed in a `.env` file in development, but for production, they should be set directly in the environment or through your deployment platform's configuration tools.

Refer to `.env.sample` for a complete list. Key variables include:

*   **`NODE_ENV`**: Set to `production` for production deployments. This enables optimizations and stricter error handling.
*   **`PORT`**: The port on which the application will listen (e.g., `3000`). Ensure this port is accessible and managed by your reverse proxy.
*   **`SESSION_SECRET`**:
    *   **Purpose**: Used to sign and encrypt session cookies.
    *   **Generation**: Must be a long, random, and unique string. Use a strong password generator (e.g., `openssl rand -base64 32`).
    *   **Security**: Critical for session security. Keep this secret confidential. Changing it will invalidate all existing user sessions.
*   **`AES_ENCRYPTION_KEY`**:
    *   **Purpose**: Used as the master key for encrypting sensitive data in the database (e.g., Jobcan passwords, Telegram tokens).
    *   **Generation**: Must be a 64-character hexadecimal string (representing 32 bytes). Use `openssl rand -hex 32` to generate a strong key.
    *   **Security**: Critical for data protection. Keep this secret highly confidential. Losing this key means encrypted data cannot be recovered. Changing it will render previously encrypted data unusable.
*   **`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`**:
    *   **Purpose**: Credentials for Google OAuth 2.0 authentication.
    *   **Obtaining**: Get these from the Google Cloud Console for your project.
    *   **Security**: Treat `GOOGLE_CLIENT_SECRET` as a password.
*   **`GOOGLE_CALLBACK_URL`**:
    *   **Purpose**: The URL Google redirects to after authentication.
    *   **Configuration**: Must exactly match one of the "Authorized redirect URIs" configured in your Google Cloud Console OAuth 2.0 client settings. It should be the application's FQDN followed by `/auth/google/callback` (e.g., `https://yourdomain.com/auth/google/callback`).
*   **`SQLITE_STORAGE_PATH`**:
    *   **Purpose**: Defines the path to the SQLite database file.
    *   **Default**: `app_database.sqlite` (relative to the project root).
    *   **Persistence**: Ensure this path is to a persistent storage location, especially in containerized environments (e.g., using Docker volumes).
*   **`DEFAULT_ADMIN_USERNAME` & `DEFAULT_ADMIN_PASSWORD`**:
    *   **Purpose**: Used to create an initial administrator account if no admin users exist in the database when the application starts.
    *   **Security**:
        *   **Critical Risk**: The `DEFAULT_ADMIN_PASSWORD` is a significant security risk if left unchanged or exposed.
        *   **Action Required**: The default admin password **MUST** be changed immediately after the first login.
        *   It is highly recommended to remove `DEFAULT_ADMIN_PASSWORD` from the environment variables after the initial admin user has been created and their password changed.
*   **`CORS_ALLOWED_ORIGINS`**:
    *   **Purpose**: Comma-separated list of frontend URLs allowed to make requests to the API.
    *   **Production**: Set this to your production frontend domain(s) (e.g., `https://your-frontend.com`).
    *   **Example**: `https://app.jobcanmate.com,https://www.jobcanmate.com`
*   **`PLAYWRIGHT_HEADLESS`**:
    *   **Purpose**: Controls whether Playwright browsers run in headless mode for Jobcan automation.
    *   **Production**: Should be set to `true`.
*   **`CALENDAR_CACHE_TTL_HOURS`**: Time-To-Live for cached ICS calendar data in hours (default: 4).
*   **`ICS_FETCH_TIMEOUT_MS`**: Timeout for fetching ICS calendar data in milliseconds (default: 10000).
*   **`LEAVE_KEYWORDS`**: Comma-separated keywords (case-insensitive) to identify leave events in ICS calendars (e.g., `휴가,연차,day off,vacation,holiday`).

**Managing Production Environment Variables:**

*   **DO NOT** commit `.env` files with production secrets to version control.
*   Use platform-specific methods:
    *   **Docker**: Use an `.env` file specified in `docker-compose.yml` or pass variables directly with `docker run -e VAR=value`.
    *   **Linux Servers**: Set variables in the user's profile (e.g., `.bashrc`, `.profile`), system-wide (e.g., `/etc/environment`), or directly in PM2 ecosystem file (less secure for secrets).
    *   **Cloud Platforms (AWS, Azure, GCP)**: Utilize their respective secret management services (e.g., AWS Secrets Manager, Azure Key Vault, Google Secret Manager).

## 4. Database Management (SQLite)

*   **Location**: The SQLite database file is located at the path specified by `SQLITE_STORAGE_PATH` (default: `app_database.sqlite` in the project root).

*   **Backup Procedures**:
    1.  **Using `sqlite3` CLI**:
        *   Ensure `sqlite3` command-line tool is installed on the server.
        *   Stop the application to prevent writes during backup (recommended for consistency): `pm2 stop jobcan-mate-webapp` or stop Docker container.
        *   Execute the backup command:
            ```bash
            sqlite3 /path/to/your/app_database.sqlite ".backup '/path/to/your/backup_$(date +%Y%m%d_%H%M%S).sqlite'"
            ```
        *   Restart the application: `pm2 restart jobcan-mate-webapp` or restart Docker container.
    2.  **Scheduled File Copy**:
        *   Alternatively, schedule a regular `cp` or `rsync` command via cron to copy the database file to a backup location. This is simpler but may result in a slightly less consistent backup if the database is being written to during the copy. Application downtime is not strictly required but reduces risk.

*   **Restoring from Backup**:
    1.  Stop the application.
    2.  Replace the current database file with the backup file:
        ```bash
        cp /path/to/your/backup.sqlite /path/to/your/app_database.sqlite
        ```
    3.  Ensure file permissions are correct for the application user.
    4.  Restart the application.

*   **Data Integrity Check**:
    *   To perform a basic integrity check:
        ```bash
        sqlite3 /path/to/your/app_database.sqlite "PRAGMA integrity_check;"
        ```
    *   This command should output "ok" if the database is not corrupted.

*   **Schema Migrations Note**:
    *   The application currently uses `sequelize.sync()` for database schema management. This is suitable for initial table creation in development.
    *   **Important**: For production environments, if you need to make schema changes *after* the initial deployment (e.g., adding new tables, altering columns), `sequelize.sync()` is **not recommended** as it can lead to data loss (e.g., `force: true` drops tables) or may not apply complex changes correctly (`alter: true` has limitations).
    *   A proper migration strategy using tools like `sequelize-cli` and creating migration files (`npx sequelize-cli migration:generate --name <migration-name>`) would be necessary for safe schema evolution in production. This is not implemented in the current project phase.

## 5. Application Monitoring

### 5.1. Health Check Endpoint

*   The `GET /health` endpoint provides a simple way to check application status.
*   **URL**: `http://yourdomain.com/health` (or relevant host/port).
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "ok",
        "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "uptime": 12345.6789 
    }
    ```
*   Integrate this endpoint with automated monitoring tools (e.g., UptimeRobot, Nagios, Prometheus) to get alerts if the application becomes unresponsive.

### 5.2. Logging

The application uses Winston for application-level logging and PM2 for process management logging.

*   **Winston Logs** (located in `logs/` directory by default):
    *   `logs/combined.log`: Contains all application logs (info, debug, warn, error).
    *   `logs/error.log`: Contains only error-level logs.
    *   `logs/exceptions.log`: Logs unhandled exceptions.
    *   `logs/rejections.log`: Logs unhandled promise rejections.
*   **PM2 Logs** (located in `pm2_logs/` directory as configured in `ecosystem.config.js`):
    *   `pm2_logs/app-out.log`: Standard output from the application (includes Winston's console transport).
    *   `pm2_logs/app-error.log`: Standard error output from the application.
*   **Viewing Logs**:
    *   **PM2**:
        ```bash
        pm2 logs jobcan-mate-webapp 
        pm2 logs jobcan-mate-webapp --lines 100 # Last 100 lines
        ```
    *   **Directly**: `tail -f logs/combined.log` or `less logs/error.log`.
*   **Centralized Logging (Recommended)**:
    *   For production, it is strongly recommended to set up centralized logging. This involves shipping logs from the server to a dedicated logging system.
    *   Popular solutions: ELK Stack (Elasticsearch, Logstash, Kibana), Splunk, Grafana Loki, AWS CloudWatch Logs, Google Cloud Logging.
    *   Winston can be configured with additional transports to send logs directly to these services.

### 5.3. PM2 Monitoring Tools

PM2 provides command-line tools for monitoring application performance:

*   `pm2 list` or `pm2 ls`: Shows status of all managed processes, including CPU usage, memory usage, uptime, and restart counts.
*   `pm2 monit`: A real-time terminal-based dashboard displaying key metrics for all processes.
*   `pm2 show jobcan-mate-webapp` (or app ID): Displays detailed information about a specific application process.

### 5.4. Key Metrics to Monitor

*   **Error Rates**: Track frequency of errors in `logs/error.log` and `pm2_logs/app-error.log`.
*   **CPU/Memory Utilization**: Monitor via `pm2 list/monit` or system-level tools (e.g., `top`, `htop`). Set up alerts for sustained high usage.
*   **Application Uptime/Restarts**: Tracked by PM2. Frequent restarts indicate underlying issues.
*   **Response Times**: If using an APM (Application Performance Monitoring) tool or a reverse proxy with logging capabilities, monitor API endpoint response times.
*   **Jobcan Task Success/Failure Rates**: Monitor logs for messages related to Jobcan automation success or failure.
*   **Database Performance**: For SQLite, this is mostly about disk I/O if the database grows very large.

## 6. Admin User Management

### 6.1. Initial Admin User

*   An initial administrator account is automatically created when the application starts **if and only if** no other admin users exist in the `AdminUsers` table.
*   This creation relies on the `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` environment variables.
*   **Default Credentials**:
    *   Username: Value of `DEFAULT_ADMIN_USERNAME` (e.g., "admin")
    *   Password: Value of `DEFAULT_ADMIN_PASSWORD` (e.g., "changeme")

### 6.2. Critical Security Note: Default Admin Password

*   The default admin password provided via `DEFAULT_ADMIN_PASSWORD` **MUST be changed immediately** after the first successful login by the administrator.
*   **Current Limitation**: The application **does not currently provide a UI or API endpoint for changing the admin password.**
*   **Methods to Change/Secure**:
    1.  **Manual Database Update (Recommended for security after initial setup)**:
        *   Stop the application.
        *   Connect to the SQLite database: `sqlite3 /path/to/your/app_database.sqlite`
        *   Generate a new bcrypt hash for the desired password (e.g., using an online bcrypt generator or a script).
        *   Update the `hashedPassword` field for the admin user:
            ```sql
            UPDATE admin_users SET hashedPassword = 'new_bcrypt_hash_here' WHERE username = 'your_admin_username';
            ```
        *   Restart the application.
    2.  **Remove/Change Environment Variable**:
        *   After the initial admin user is created and you've confirmed login, **remove `DEFAULT_ADMIN_PASSWORD` from your production environment variables** and restart the application. This prevents it from being reused or exposed.
        *   If you need to reset it (and only one admin exists), you could temporarily set `DEFAULT_ADMIN_PASSWORD` to a new plain-text password, delete the existing admin user from the database, and restart the app. The app would then re-seed the admin with the new password. This is cumbersome and risky.

### 6.3. Managing Additional Admin Users

*   The application currently **does not support** creating additional admin users or managing admin roles through a UI or API.
*   If additional admin users are required, they would need to be added manually to the database with a bcrypt-hashed password.

## 7. System Maintenance

### 7.1. Updating the Application

*   **Standard Deployment (PM2)**:
    1.  Navigate to the application directory: `cd /path/to/jobcan-mate-webapp`
    2.  Pull the latest code: `git pull origin main` (or relevant branch).
    3.  Install/update dependencies (if `package.json` changed): `npm ci --only=production`
    4.  Reload the application with PM2 for zero-downtime (if possible for your app structure):
        ```bash
        pm2 reload jobcan-mate-webapp
        ```
        Or, for a full restart:
        ```bash
        pm2 restart jobcan-mate-webapp
        ```
*   **Docker Deployment**:
    1.  Pull the latest code or ensure your CI/CD pipeline does.
    2.  Rebuild the Docker image:
        ```bash
        docker build -t yourusername/jobcan-mate-webapp:latest .
        # Or, if using docker-compose:
        # docker-compose build app 
        ```
    3.  Stop the old container and start the new one:
        ```bash
        # If using docker-compose:
        # docker-compose down && docker-compose up -d app
        # If using docker run:
        # docker stop <old_container_id_or_name>
        # docker rm <old_container_id_or_name>
        # docker run -d --name jobcan-mate-container -p 3000:3000 --env-file ./prod.env yourusername/jobcan-mate-webapp:latest 
        ```
        (Ensure your Docker command includes necessary volume mounts and environment variable configurations.)

### 7.2. Managing Dependencies

*   Periodically check for vulnerabilities in dependencies:
    ```bash
    npm audit
    ```
*   Review audit results and update packages as necessary. Be mindful of breaking changes.
*   Plan updates for Node.js runtime and PM2 itself.

### 7.3. Log Rotation

*   **Winston Logs (`logs/`)**: Winston's default file transport does not perform log rotation.
*   **PM2 Logs (`pm2_logs/`)**: PM2's built-in log management also has limitations for rotation.
*   **Recommendation**:
    *   Use a system-level tool like `logrotate` (common on Linux systems) to manage rotation for both Winston and PM2 log files. Configure `logrotate` to compress old logs and delete them after a certain period.
    *   Alternatively, for PM2 logs specifically, the `pm2-logrotate` module can be installed and configured: `pm2 install pm2-logrotate`.

## 8. Troubleshooting Common Admin Issues

*   **Application Fails to Start**:
    *   Check PM2 logs: `pm2 logs jobcan-mate-webapp --lines 100`.
    *   Check Winston logs: `tail -n 100 logs/error.log` and `tail -n 100 logs/combined.log`.
    *   Verify all required environment variables are set correctly.
    *   Check for port conflicts if `PORT` is already in use.
    *   Ensure database file path is correct and writable by the application user.
*   **Database Connection/Access Problems**:
    *   Verify `SQLITE_STORAGE_PATH` is correct.
    *   Ensure the directory containing the SQLite file exists and is writable by the user running the application.
    *   Check for sufficient disk space.
*   **PM2 Process Issues (e.g., `errored` state, frequent restarts)**:
    *   Use `pm2 logs jobcan-mate-webapp` for detailed error messages.
    *   Use `pm2 show jobcan-mate-webapp` to inspect restart counts, memory usage, etc.
    *   Check for unhandled exceptions or promise rejections in `logs/exceptions.log` and `logs/rejections.log`.
*   **Docker Container Problems**:
    *   View container logs: `docker logs <container_id_or_name>`.
    *   Access container shell for debugging: `docker exec -it <container_id_or_name> sh`.
    *   Check Docker volume mounts and environment variable configurations.
*   **Google OAuth Configuration Errors**:
    *   Double-check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
    *   Ensure `GOOGLE_CALLBACK_URL` in your `.env` file matches **exactly** one of the "Authorized redirect URIs" in your Google Cloud Console OAuth client settings, including `http` vs `https` and any trailing slashes.
    *   Check server logs for detailed error messages from Passport.js or Google's API.

## 9. Security Best Practices for Admins

*   **System Updates**: Keep the server OS, Node.js, PM2, and all other system packages up to date with security patches.
*   **Strong Credentials**: Use strong, unique passwords for the application's admin account, database (if applicable in other contexts), and any external service credentials. Enforce password changes for the default admin.
*   **Firewall**: Implement firewall rules (e.g., `ufw`, `iptables`, or cloud provider firewalls) to restrict access to only necessary ports (e.g., port for your reverse proxy, SSH).
*   **SSH Security**: Use SSH key-based authentication for server access. Disable password-based SSH authentication if possible.
*   **Regular Log Review**: Periodically review application logs (Winston, PM2) and system logs (e.g., `/var/log/auth.log`, `/var/log/syslog`) for suspicious activity.
*   **Principle of Least Privilege**:
    *   Run the application process with a dedicated non-root user (as configured in the `Dockerfile`).
    *   Ensure file permissions for application files, logs, and database are appropriately restricted.
*   **HTTPS**: Ensure your reverse proxy (e.g., Nginx) is configured to serve the application over HTTPS using valid SSL/TLS certificates (e.g., from Let's Encrypt).
*   **Backup Regularly**: Follow database and application code backup procedures.
*   **Secure Environment Variables**: Store sensitive environment variables (secrets, API keys) securely, not in version control. Use appropriate secret management tools for your deployment environment.

---

This guide provides a starting point for administering Jobcan Mate. Adapt these recommendations to your specific operational environment and security policies.
