const logger = require('../utils/logger');

/**
 * Middleware to check if the user is authenticated as an admin.
 * Assumes session middleware and Passport.js (or similar) have populated req.session.userType.
 */
const isAdmin = (req, res, next) => {
  // Check if user is authenticated (req.isAuthenticated() is a common Passport.js method)
  // and if the userType in session is 'admin'.
  if (req.isAuthenticated && req.isAuthenticated() && req.session.userType === 'admin') {
    logger.debug(`Admin access granted for user: ${req.session.username} to route: ${req.originalUrl}`);
    return next();
  }

  // Log denied access attempt
  let logDetails = {
    message: 'Admin access denied.',
    originalUrl: req.originalUrl,
    method: req.method,
    ip: req.ip,
  };

  if (req.user) { // If req.user is populated by Passport for non-admin users
    logDetails.userId = req.user.id;
    logDetails.userEmail = req.user.email;
  }
  if (req.session) {
    logDetails.sessionId = req.session.id; // Be cautious with logging entire session object
    logDetails.sessionUserType = req.session.userType;
    logDetails.sessionUsername = req.session.username;
  }

  logger.warn('Admin access attempt denied.', logDetails);

  res.status(403).json({
    error: {
      message: 'Access denied. Admin privileges required.',
      code: 'FORBIDDEN_ADMIN_ACCESS',
    },
  });
};

/**
 * Middleware to check if the user is authenticated (generic, not admin-specific).
 * This is a common middleware that might be useful elsewhere.
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
     // Also check if it's a regular user session, not an unauthenticated admin trying to access user routes
    if (req.session.userType === 'admin' && !req.originalUrl.startsWith('/admin')) { // Example admin route prefix
        logger.warn(`Admin user ${req.session.username} attempted to access non-admin authenticated route: ${req.originalUrl}`);
        return res.status(403).json({ error: { message: 'Access denied for this user type on this route.' } });
    }
    logger.debug(`User authenticated for route: ${req.originalUrl}`);
    return next();
  }
  logger.warn(`Unauthenticated access attempt to route: ${req.originalUrl}`);
  res.status(401).json({ error: { message: 'Access denied. You must be logged in to view this page.', code: 'UNAUTHENTICATED' } });
};


module.exports = {
  isAdmin,
  isAuthenticated, // Exporting this as well, as it's generally useful
};
