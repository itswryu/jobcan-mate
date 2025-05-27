# Jobcan Mate - Installation Guide

## 1. Introduction

This guide provides instructions for setting up the Jobcan Mate application for both development and production environments. Following these steps will help you get the application running smoothly.

## 2. System Requirements

### 2.1. General

*   **Git**: For cloning the repository.

### 2.2. For Running (Development or PM2/Node.js Deployment)

*   **Node.js**: Version 20.x or later is recommended.
*   **npm**: Node Package Manager (usually comes bundled with Node.js).

### 2.3. For Playwright

*   If running the application locally for development or building a Docker image for the first time on a new machine, Playwright's browser binaries might need to be installed. This is typically handled during the setup steps below using `npx playwright install --with-deps`.

### 2.4. For Production (Docker Deployment)

*   **Docker**: Latest stable version.
*   **Docker Compose**: Latest stable version (recommended for easier management).

### 2.5. For Production (PM2 on a Virtual Machine)

*   **PM2**: Globally installed (`npm install pm2 -g`).
*   **Reverse Proxy**: A web server like Nginx or Caddy is highly recommended for SSL termination, serving static assets (optional), and as a reverse proxy.

## 3. Development Setup

These steps will guide you through setting up a local development environment.

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/jobcan-mate-webapp.git 
    # Replace <your-username/jobcan-mate-webapp.git> with the actual repository URL
    ```

2.  **Navigate to Directory**:
    ```bash
    cd jobcan-mate-webapp
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Setup Playwright Browsers**:
    This command ensures that the headless browser binaries required by Playwright are downloaded and available for Jobcan automation tasks.
    ```bash
    npx playwright install --with-deps
    ```

5.  **Create `.env` File**:
    Copy the sample environment file. This file will store your local configuration settings.
    ```bash
    cp .env.sample .env
    ```

6.  **Configure `.env` File**:
    Open the newly created `.env` file and fill in the development values. **Do not use production secrets in this file.**

    *   **`NODE_ENV`**: Set to `development`.
    *   **`PORT`**: (e.g., `3000`).
    *   **`SESSION_SECRET`**: A random string for session signing. For development, a simple string like `devsecret` is okay, but for production, use a strong random string (e.g., generate with `openssl rand -base64 32`).
    *   **`AES_ENCRYPTION_KEY`**: A 64-character hex string (32 bytes) for data encryption. For development, you can use a placeholder like `abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890` (ensure it's 64 hex chars). For production, generate a secure one (e.g., `openssl rand -hex 32`).
    *   **Google OAuth Credentials**:
        *   `GOOGLE_CLIENT_ID`: Your Google Cloud Console project's OAuth 2.0 Client ID.
        *   `GOOGLE_CLIENT_SECRET`: Your Google Cloud Console project's OAuth 2.0 Client Secret.
        *   `GOOGLE_CALLBACK_URL`: Set to `http://localhost:PORT/auth/google/callback` (e.g., `http://localhost:3000/auth/google/callback`). Ensure this exact URL is added to your "Authorized redirect URIs" in the Google Cloud Console.
    *   **`SQLITE_STORAGE_PATH`**: Path to the SQLite database file. The default `app_database.sqlite` in the project root is fine for development. You might change it to `database/dev_app_database.sqlite` to keep it organized.
    *   **Default Admin User**:
        *   `DEFAULT_ADMIN_USERNAME`: (e.g., `admin`)
        *   `DEFAULT_ADMIN_PASSWORD`: (e.g., `devpassword123`)
    *   Other variables (CORS, Jobcan selectors, Playwright timeouts, Calendar settings) can often be left as their defaults from `.env.sample` or `config/config.js` for local development.

7.  **Run the Application**:
    To start the application in development mode with automatic restarts on file changes (using `nodemon`):
    ```bash
    npm run dev
    ```
    If you don't have `nodemon` installed globally, you can run `npx nodemon server.js` or install it via `npm install --save-dev nodemon`.
    Alternatively, for a simple start:
    ```bash
    npm start 
    ```

8.  **Access the Application**:
    Open your web browser and navigate to `http://localhost:PORT` (e.g., `http://localhost:3000`).

## 4. Production Deployment

Deploying to production requires careful configuration for security, reliability, and performance.

### 4.1. General Production Configuration Notes

*   **`NODE_ENV=production`**: This is critical. Ensure this environment variable is set in your production environment. It enables various optimizations and security features in Express and other libraries.
*   **Secrets Management**:
    *   `SESSION_SECRET`: Must be a strong, unique, and randomly generated string.
    *   `AES_ENCRYPTION_KEY`: Must be a cryptographically strong, randomly generated 64-character hex string.
    *   **CRITICAL**: The `DEFAULT_ADMIN_PASSWORD` should be changed immediately after the first login (see "Initial Application Configuration" section). For enhanced security, remove `DEFAULT_ADMIN_PASSWORD` from the environment variables after the initial admin user is set up and their password changed.
*   **`CORS_ALLOWED_ORIGINS`**: Set this to the actual domain(s) from which your frontend will be served (e.g., `https://app.yourdomain.com`).
*   **Google OAuth Callback URL**: Update `GOOGLE_CALLBACK_URL` to your production application's FQDN (e.g., `https://app.yourdomain.com/auth/google/callback`). This URL must be registered in your Google Cloud Console.
*   **Database Path**: Ensure `SQLITE_STORAGE_PATH` points to a persistent and backed-up location.

### 4.2. Method A: Docker + Docker Compose (Recommended)

This method containerizes the application for consistent deployments. A `docker-compose.yml` file is assumed for easier management, though not provided in this project phase (you'd typically create one).

1.  **Prerequisites**: Docker and Docker Compose installed on the server.
2.  **Clone Repository**: If not already done, clone the application repository onto your server.
3.  **Production `.env` File**:
    *   Create a `.env` file in the project root specifically for production. **DO NOT commit this file to version control.**
    *   Fill it with your production-level secrets and configurations.
    *   Alternatively, manage environment variables directly in your `docker-compose.yml` or through your hosting platform's secret management.
4.  **Build Docker Image**:
    *   Using Docker Compose (if you have a `docker-compose.yml`):
        ```bash
        docker-compose build app 
        # 'app' is the service name in your docker-compose.yml
        ```
    *   Using Docker CLI directly with the provided `Dockerfile`:
        ```bash
        docker build -t yourusername/jobcan-mate-webapp:latest .
        ```
5.  **Run Application**:
    *   Using Docker Compose:
        ```bash
        docker-compose up -d app
        ```
    *   Using Docker CLI:
        ```bash
        docker run -d --name jobcan-mate-container \
          -p <HOST_PORT>:3000 \
          --env-file ./.env \
          -v $(pwd)/database:/usr/src/app/database \
          -v $(pwd)/logs:/usr/src/app/logs \
          -v $(pwd)/pm2_logs:/usr/src/app/pm2_logs \
          yourusername/jobcan-mate-webapp:latest
        ```
        (Adjust `<HOST_PORT>`, volume paths, and image name as needed.)

6.  **Persistent Data**:
    *   The provided `Dockerfile` sets `WORKDIR /usr/src/app`.
    *   **SQLite Database**: `SQLITE_STORAGE_PATH` defaults to `app_database.sqlite` (relative to project root, i.e., `/usr/src/app/app_database.sqlite` inside the container). Use a Docker volume to map `/usr/src/app/database` (or the directory of your `SQLITE_STORAGE_PATH`) to a persistent location on the host machine. Example: `-v /path/on/host/database:/usr/src/app/database`.
    *   **Logs**: Similarly, map `/usr/src/app/logs` (Winston logs) and `/usr/src/app/pm2_logs` (PM2 logs) to host directories for persistence and easier access.

7.  **Reverse Proxy Setup (Conceptual - Nginx Example)**:
    *   A reverse proxy like Nginx is crucial for SSL termination (HTTPS), optionally serving static assets, and potentially load balancing if scaling.
    *   **Minimal Nginx Server Block Example**:
        ```nginx
        # Redirect HTTP to HTTPS
        server {
           listen 80;
           server_name yourdomain.com; # Replace with your domain
           return 301 https://$host$request_uri;
        }
        
        server {
           listen 443 ssl http2;
           server_name yourdomain.com; # Replace with your domain
        
           # SSL Certificate paths (replace with your actual paths)
           ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
           ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        
           # Recommended SSL options (these files are often provided by Certbot)
           include /etc/letsencrypt/options-ssl-nginx.conf; 
           ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
        
           location / {
               proxy_pass http://localhost:3000; # Assuming Node app (or Docker container mapped port) runs on port 3000
               proxy_http_version 1.1;
               proxy_set_header Upgrade $http_upgrade;
               proxy_set_header Connection 'upgrade';
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
               proxy_set_header X-Forwarded-Proto $scheme;
               proxy_cache_bypass $http_upgrade;
           }
        
           # Optional: Serve static assets directly with Nginx for better performance
           # location ~ ^/(css|js|img|static)/ {
           #     root /path/to/jobcan-mate-webapp/public; # Adjust if static files are elsewhere
           #     expires 1y;
           #     add_header Cache-Control "public";
           # }
        }
        ```
    *   **SSL Certificates**: Use tools like Certbot with Let's Encrypt to obtain free SSL certificates.

### 4.3. Method B: PM2 on a Virtual Machine

This method involves running the Node.js application directly on a VM using PM2.

1.  **Prerequisites**: Node.js, npm, and PM2 (`npm install pm2 -g`) installed on the VM.
2.  **Clone Repository**: Clone the application repository onto your VM.
3.  **Navigate to Directory**: `cd jobcan-mate-webapp`.
4.  **Install Production Dependencies**:
    ```bash
    npm ci --only=production
    ```
5.  **Set Environment Variables**:
    *   Set production environment variables directly on the server. Methods include:
        *   Editing `/etc/environment`.
        *   Setting them in the user's profile (e.g., `~/.bashrc`, `~/.profile`) and sourcing it.
        *   Using a script that exports variables before PM2 starts the app.
    *   **Ensure `NODE_ENV=production` is set.**
6.  **Create Necessary Directories**:
    Ensure these directories exist at the project root and are writable by the user running the PM2 process:
    ```bash
    mkdir -p database logs pm2_logs 
    # Example: sudo chown -R your-app-user:your-app-group database logs pm2_logs
    ```
7.  **Start Application with PM2**:
    The `ecosystem.config.js` file is configured for production.
    ```bash
    pm2 start ecosystem.config.js --env production
    ```
8.  **Configure PM2 to Start on Boot**:
    PM2 can generate a startup script for your specific OS.
    ```bash
    pm2 startup
    ```
    Follow the instructions output by this command.
9.  **Set Up Reverse Proxy**:
    *   Configure a reverse proxy (like Nginx or Caddy) to forward requests from port 80/443 to the port your Node.js application is running on (e.g., 3000).
    *   The Nginx configuration would be similar to the one shown in the Docker method, pointing `proxy_pass` to `http://localhost:PORT;`.

## 5. Initial Application Configuration (Post-Deployment)

1.  **Access Application**: Open your web browser and navigate to the domain name you've configured.
2.  **Admin Login**: Log in using the default admin credentials specified by `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` in your environment variables.
3.  **CRITICAL: Change Default Admin Password**:
    *   **Limitation**: The application currently does not have a UI for changing the admin password.
    *   **Recommended Action**:
        1.  **Securely Generate a New Hash**: Use a reliable tool or script to generate a bcrypt hash for your new desired admin password. Example using Node.js `bcrypt` library (run this locally or on a secure machine, not necessarily on the production server):
            ```javascript
            // const bcrypt = require('bcrypt');
            // const saltRounds = 10;
            // const newPassword = 'yourNewStrongPassword';
            // bcrypt.hash(newPassword, saltRounds, function(err, hash) {
            //     if (err) console.error(err);
            //     else console.log(hash);
            // });
            ```
        2.  **Update Database Manually**:
            *   Stop the application: `pm2 stop jobcan-mate-webapp` or stop Docker container.
            *   Connect to your SQLite database: `sqlite3 /path/to/your/app_database.sqlite`.
            *   Execute the SQL update:
                ```sql
                UPDATE admin_users SET hashedPassword = 'PASTE_NEW_BCRYPT_HASH_HERE' WHERE username = 'your_admin_username';
                ```
                (Replace `your_admin_username` with the actual admin username, e.g., the value of `DEFAULT_ADMIN_USERNAME`).
            *   Exit sqlite: `.quit`.
        3.  **Remove Environment Variable**: Remove or clear the `DEFAULT_ADMIN_PASSWORD` environment variable from your production setup.
        4.  Restart the application.
    *   **Alternative (Less Secure for Active Systems)**: If the database seeding logic in `database/setup.js` were to update an existing admin's password if found by `DEFAULT_ADMIN_USERNAME` when `DEFAULT_ADMIN_PASSWORD` changes, you could temporarily set a new `DEFAULT_ADMIN_PASSWORD` and restart. However, the current seeding logic only creates if `adminCount === 0`.
4.  **Verify Google OAuth**: Test Google login. Ensure the `GOOGLE_CALLBACK_URL` in your production environment variables and Google Cloud Console matches your production domain and path.

## 6. Troubleshooting Installation

*   **Port Conflicts (`EADDRINUSE`)**: Another service is using the configured `PORT`. Change the `PORT` or stop the conflicting service.
*   **Environment Variables**: Double-check that all required environment variables are set correctly in the production environment and are accessible by the application process. Incorrect secrets (`SESSION_SECRET`, `AES_ENCRYPTION_KEY`) or `GOOGLE_CALLBACK_URL` are common issues.
*   **Database Issues**:
    *   Ensure the path for `SQLITE_STORAGE_PATH` is correct and the directory is writable by the application user.
    *   For Docker, ensure volumes are correctly mapped.
*   **Playwright Browser Dependencies**:
    *   On a new VM or minimal Docker base, system dependencies for Playwright's browsers might be missing. `npx playwright install --with-deps` usually handles this. If building Docker, this step should be in the `Dockerfile` or run before building if not included.
*   **Reverse Proxy Errors**: Check Nginx/Caddy logs. Common issues include incorrect `proxy_pass` URL, SSL certificate problems, or firewall blocking.
*   **Firewall**: Ensure your server's firewall (e.g., `ufw`, `firewalld`, or cloud provider's security groups) allows traffic on the necessary ports (e.g., 80 for HTTP, 443 for HTTPS).
*   **Application Logs**: Always check application logs for detailed error messages (Winston logs in `logs/` and PM2 logs in `pm2_logs/` or via `pm2 logs`).

---

This installation guide should help you set up Jobcan Mate. For further details on administration and development, refer to `ADMIN_GUIDE.md` and `DEVELOPER_GUIDE.md` respectively.I have generated the content for `docs/INSTALLATION_GUIDE.md`.

Now, I will update the main `README.md`.
I'll first read its current content.
