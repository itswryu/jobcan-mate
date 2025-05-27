const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/authMiddleware.js');
const logger = require('../utils/logger.js');

// Apply isAdmin middleware to all routes in this file
router.use(isAdmin);

// GET /admin/dashboard
router.get('/dashboard', (req, res) => {
    logger.info(`Admin user ${req.session.username} accessed admin dashboard.`);
    res.status(200).json({
        status: 'success',
        data: {
            message: 'Welcome to the Admin Dashboard!',
            adminUser: {
                id: req.session.userId,
                username: req.session.username,
                userType: req.session.userType
            }
        }
    });
});

// GET /admin/users (Placeholder for user listing)
router.get('/users', (req, res) => {
    logger.info(`Admin user ${req.session.username} requested to view all users (placeholder).`);
    res.status(200).json({
        status: 'success',
        data: {
            message: 'Admin User Listing (Placeholder)',
            info: 'This endpoint will list all users.'
        }
    });
});

// GET /admin/system-health (Placeholder for system stats)
router.get('/system-health', (req, res) => {
    logger.info(`Admin user ${req.session.username} requested system health (placeholder).`);
    res.status(200).json({
        status: 'success',
        data: {
            message: 'System Health (Placeholder)',
            systemStatus: 'Nominal', // Renamed 'status' to avoid conflict with top-level 'status'
            timestamp: new Date().toISOString()
        }
    });
});

module.exports = router;
