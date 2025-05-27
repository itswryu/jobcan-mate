# Use an official Node.js runtime as a parent image (choose a specific LTS version)
FROM node:20-slim

# Add image metadata
LABEL org.opencontainers.image.description="Automates Jobcan clock-in/out operations. Supports multi-architecture (amd64, arm64), holiday detection via ICS calendar, and Telegram notifications."

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev
# Install Playwright browsers and their dependencies
RUN npx playwright install --with-deps chromium
# If you have a complex build step, you might use:
# RUN npm ci --only=production

# Copy configuration file
COPY config.json ./config.json

# Copy application source code
COPY src ./src

# Command to run the application (scheduler)
CMD [ "node", "src/scheduler.js" ]
