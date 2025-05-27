const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController'); // Import the controller

// Placeholder: Redirect to a login failure page (you can create a simple HTML page or route later)
router.get('/login-failure', authController.loginFailure);

// Placeholder: Redirect to a user dashboard page (you can create this route/view later)
router.get('/user-dashboard', authController.userDashboard);


// Admin Login Route
router.post('/admin/login', authController.handleAdminLogin);

// Route to initiate Google OAuth authentication
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'], // Request access to the user's profile and email
  accessType: 'offline', // Request refresh token
  prompt: 'consent' // Force consent screen to ensure refresh token is sent
}));

// Callback route for Google to redirect to after authentication
router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/auth/login-failure', // Redirect on authentication failure
  successRedirect: '/auth/user-dashboard' // Redirect on authentication success
}));

// Route to log out the user (now uses the controller)
router.post('/logout', authController.logout);

module.exports = router;
