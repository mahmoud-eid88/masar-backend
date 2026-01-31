const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/couriers', adminController.getAllCouriers);
router.post('/users/update-role', adminController.updateUserRole);

// Recent orders
router.get('/orders/recent', adminController.getRecentOrders);

module.exports = router;
