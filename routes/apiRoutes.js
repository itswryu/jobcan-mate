const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware.js'); // Assuming isAdmin is not needed for these user-specific settings
const {
    getUserSettings,
    saveUserSettings,
    testJobcanConnection,
    testTelegramConnection,
    getCsrfToken
} = require('../controllers/apiController.js');

// CSRF token endpoint - typically does not need CSRF protection itself,
// and GET requests are ignored by default by csrf-csrf's protection middleware.
// It also doesn't strictly need `isAuthenticated` if CSRF tokens are generated for anonymous sessions
// that might later authenticate, but for a settings page context, user should be auth'd.
// However, if the settings page JS loads this *before* user might be redirected to login,
// then `isAuthenticated` here could be problematic.
// For now, let's assume the settings page (where JS calls this) is only accessible after login.
router.get('/csrf-token', isAuthenticated, getCsrfToken); // Added isAuthenticated for consistency with settings page context

// User settings routes
router.get('/user/settings', isAuthenticated, getUserSettings);
router.post('/user/settings', isAuthenticated, saveUserSettings); // CSRF protection is global in app.js

// Test connection routes
router.post('/test/jobcan', isAuthenticated, testJobcanConnection); // CSRF protection is global
router.post('/test/telegram', isAuthenticated, testTelegramConnection); // CSRF protection is global

module.exports = router;
