const { AdminUser } = require('../database/setup'); // Import AdminUser model
const logger = require('../utils/logger'); // Import Winston logger

// Placeholder for Google OAuth callback (from previous subtasks)
exports.handleGoogleCallback = (req, res) => {
  logger.info('User authenticated via Google, redirecting to user-dashboard. User:', { userId: req.user?.id, email: req.user?.email });
  res.redirect('/auth/user-dashboard');
};

// Admin Login Handler
exports.handleAdminLogin = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    logger.warn('Admin login attempt with missing username or password.');
    return res.status(400).json({ error: { message: 'Username and password are required.' } });
  }

  try {
    const adminUser = await AdminUser.findOne({ where: { username } });

    if (!adminUser || !(await adminUser.isValidPassword(password))) {
      logger.warn(`Admin login failed for username: ${username}. Invalid credentials.`);
      return res.status(401).json({ error: { message: 'Invalid username or password.' } });
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Error regenerating session during admin login:', { message: err.message, stack: err.stack });
        return next(err);
      }

      // Store admin user details in session
      req.session.userId = adminUser.id;
      req.session.username = adminUser.username;
      req.session.userType = 'admin'; // Differentiate admin session

      logger.info(`Admin user '${adminUser.username}' logged in successfully.`);
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Admin login successful',
          user: { id: adminUser.id, username: adminUser.username, userType: 'admin' },
        }
      });
    });
  } catch (error) {
    logger.error('Admin login error:', { message: error.message, stack: error.stack });
    next(error); // Pass to global error handler
  }
};

// Updated Logout Handler
exports.logout = (req, res, next) => {
  const username = req.session?.username || (req.user ? (req.user.displayName || req.user.email) : 'Unknown User');
  const userType = req.session?.userType || (req.user ? 'google_user' : 'Unknown Type');

  req.logout((logoutErr) => {
    if (logoutErr) {
      logger.error('Error during req.logout():', { message: logoutErr.message, stack: logoutErr.stack });
      return next(logoutErr);
    }

    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        logger.error('Error destroying session during logout:', { message: destroyErr.message, stack: destroyErr.stack });
        return next(destroyErr);
      }
      logger.info(`User '${username}' (type: ${userType}) logged out successfully.`);
      res.status(200).json({ status: 'success', data: { message: 'Logout successful' } });
      // Or for a web context: res.redirect('/');
    });
  });
};


// Placeholder for a login failure page or logic (Google OAuth)
exports.loginFailure = (req, res) => {
  logger.warn('Google authentication failed.');
  res.status(401).send('Google authentication failed. Please try again.');
};

// Placeholder for a user dashboard page or logic (Google OAuth user)
exports.userDashboard = (req, res) => {
  if (req.isAuthenticated() && req.session.userType !== 'admin') { // Ensure it's not an admin session viewing this
    logger.debug(`Displaying user dashboard for: ${req.user.displayName || req.user.email}`);
    res.send(`
      <h1>Welcome to your Dashboard, ${req.user.displayName || req.user.email}!</h1>
      <p>User ID: ${req.user.id}</p>
      <p>Email: ${req.user.email || 'N/A'}</p>
      <form action="/auth/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    `);
  } else if (req.session.userType === 'admin') {
      logger.warn(`Admin user ${req.session.username} attempted to access user dashboard.`);
      res.status(403).send('Access denied. Admins should use the admin panel.');
  }
  else {
    logger.warn('Unauthenticated access attempt to user dashboard.');
    res.redirect('/'); // Or to a login page
  }
};

// Note: The `handleGoogleCallback` and `userDashboard` are primarily for Google OAuth users.
// Admin users will have a different flow and likely different "dashboard" or management interface.
