const express = require('express');
const helmet = require('helmet');
const cors = require('cors'); // Will be re-initialized with options
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');
const config = require('./config/config'); // For sessionSecret and CORS
const logger = require('./utils/logger'); // Import Winston logger
const morgan = require('morgan'); // Import Morgan
const compression = require('compression'); // Import compression

// Initialize Passport and load configuration
require('./config/passport-setup'); // This will run the passport configuration code
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Import admin routes

const app = express();

// Trust proxy for secure cookies if behind a proxy like Nginx or Heroku
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // trust first proxy
}

// --- HTTP Request Logging ---
// Use Morgan with Winston stream. Log format depends on NODE_ENV.
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined', { stream: logger.stream }));

// --- Compression Middleware ---
app.use(compression());

// --- Security Middlewares ---

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `windowMs`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: { message: 'Too many requests from this IP, please try again after 15 minutes', status: 429 } },
});

// CSRF Protection Setup
const {
    invalidCsrfTokenError, // Will be used in the error handler
    generateToken: generateTokenFunc, // Renamed to avoid conflict in this scope
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => config.sessionSecret, // Use sessionSecret from config
    cookieName: "x-csrf-token", // Ensure this is a unique name for the CSRF token cookie
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === 'production', httpOnly: true },
    // ignoredMethods: ["GET", "HEAD", "OPTIONS"], // Default is fine for GET /api/csrf-token
});


// Security headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowlist = config.cors.allowedOrigins;
    // Allow requests with no origin (like mobile apps or curl requests) in development,
    // or if the origin is in the allowlist.
    // For production, you might want to be stricter and always require an origin if it's browser-based.
    if (!origin || allowlist.includes(origin) || (process.env.NODE_ENV === 'development' && (!origin || allowlist.some(o => o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1'))))) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked origin - ${origin}. Allowed: ${allowlist.join(',')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent with requests
};
app.use(cors(corsOptions));


// Request body parsing (should be before CSRF protection if forms are involved)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: config.sessionSecret, // Use sessionSecret from config
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' } // Secure cookie settings
}));

// Initialize Passport and use session
app.use(passport.initialize());
app.use(passport.session());

// Middleware to make CSRF token generation function available on req object
// This must be before doubleCsrfProtection if routes needing req.generateCsrfToken() are also protected
app.use((req, res, next) => {
    req.generateCsrfToken = () => generateTokenFunc(req, res);
    next();
});

// --- Apply CSRF Protection Globally ---
// This needs to be after session and body parsing
app.use(doubleCsrfProtection);

// Middleware to make CSRF token available in res.locals (for server-rendered views, if any)
app.use((req, res, next) => {
    // Only generate if it's not an API request that might be using req.generateCsrfToken()
    // or if it's explicitly needed for a view.
    // For SPAs, this res.locals.csrfToken is less critical if /api/csrf-token is used.
    if (req.generateCsrfToken) { // Check if the function is attached
        res.locals.csrfToken = req.generateCsrfToken();
    }
    next();
});


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok', // Using 'ok' as per common practice, not 'success' wrapper here
        timestamp: new Date().toISOString(),
        uptime: process.uptime() // Uptime in seconds
    });
});

// Main Page Route GET /
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.session.userType === 'admin') {
      logger.debug('Authenticated admin accessing root, redirecting to admin dashboard.');
      return res.redirect('/admin/dashboard');
    }
    logger.debug('Authenticated user accessing root, redirecting to settings.');
    return res.redirect('/settings.html');
  }
  logger.debug('Unauthenticated user accessing root, redirecting to login.');
  res.redirect('/login.html');
});

// Mount authentication routes (with rate limiting)
app.use('/auth', generalLimiter, authRoutes);

// Mount admin routes
// This should be after session, CSRF, etc., but before the global error handler
app.use('/admin', adminRoutes); // generalLimiter could be applied here too if desired

// Mount API routes
// This should be after session, CSRF, etc., but before the global error handler
const apiRoutes = require('./routes/apiRoutes'); // Import API routes
app.use('/api', generalLimiter, apiRoutes); // Apply generalLimiter to API routes as well

// Global error handler
app.use((err, req, res, next) => {
  // CSRF error handling
  if (err instanceof invalidCsrfTokenError) {
    logger.warn(`Invalid CSRF Token: ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    return res.status(403).json({ error: { message: 'Invalid CSRF token.', code: 'INVALID_CSRF_TOKEN', status: 403 } });
  }

  // General error handling
  // Log the detailed error with stack trace, request info, etc.
  // This logging should happen regardless of NODE_ENV for debugging purposes on the server.
  logger.error(`${err.status || 500} - ${err.message || 'Internal Server Error'} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    stack: err.stack,
    // For security, avoid logging sensitive parts of req.body in production unless filtered
    body: process.env.NODE_ENV === 'development' ? req.body : { redacted: 'Request body hidden in production logs unless filtered' },
    params: req.params,
    query: req.query,
    isOperational: err.isOperational, // Log if the error was marked as operational
  });

  const statusCode = err.status || 500;
  let responseErrorMessage = err.message || 'Internal Server Error';

  // In production, for 5xx errors that are NOT marked as operational, show a generic message.
  if (process.env.NODE_ENV === 'production' && statusCode >= 500 && !err.isOperational) {
      responseErrorMessage = 'An unexpected internal server error occurred. Please try again later.';
  }

  const errorResponse = {
      message: responseErrorMessage,
      // status: statusCode, // status is already part of the HTTP response status code itself.
  };

  if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
      // If you adopt a pattern of wrapping original errors:
      // if (err.originalError) errorResponse.originalError = { message: err.originalError.message, stack: err.originalError.stack };
  }
  res.status(statusCode).json({ error: errorResponse });
});

module.exports = app;
