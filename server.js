require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./database/setup'); // Import initializeDatabase
const logger = require('./utils/logger'); // Import Winston logger
const { initScheduler } = require('./services/scheduleService'); // Import initScheduler

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeDatabase(); // Ensure DB is connected and tables synced
    await initScheduler(); // Initialize the scheduler after database setup
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start the server:', { message: error.message, stack: error.stack });
    process.exit(1); // Exit if server fails to start (e.g., DB connection issue)
  }
}

startServer();
