const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logsDir = 'logs';

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const { combine, colorize, simple, timestamp, json } = winston.format;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // Console transport - more readable for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      ),
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), json()), // Store errors in JSON format with timestamp
    }),
    // File transport for all logs (combined)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: combine(timestamp(), json()), // Store all logs in JSON format with timestamp
    }),
  ],
  exceptionHandlers: [ // Catch unhandled exceptions
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [ // Catch unhandled promise rejections
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

// Add a stream interface for Morgan
// The 'http' level is conventionally used for Morgan logs
logger.stream = {
  write: (message) => {
    logger.http(message.trim()); // Use .trim() to remove trailing newline from Morgan
  },
};

module.exports = logger;
