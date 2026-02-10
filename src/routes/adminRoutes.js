const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware'); // Added


// Dashboard statistics
router.get('/stats', authenticateToken, authorizeRoles('admin', 'support'), adminController.getDashboardStats);
router.get('/stats/growth', authenticateToken, authorizeRoles('admin'), adminController.getReferralStats);
router.get('/stats/charts', authenticateToken, authorizeRoles('admin'), adminController.getChartStats);

// User management
router.get('/users', authenticateToken, authorizeRoles('admin', 'support'), adminController.getAllUsers);
router.get('/couriers', authenticateToken, authorizeRoles('admin', 'support'), adminController.getAllCouriers);
router.post('/users/update-role', authenticateToken, authorizeRoles('admin'), adminController.updateUserRole);

// Recent orders
router.get('/orders/recent', authenticateToken, authorizeRoles('admin', 'support'), adminController.getRecentOrders);

// Identity Verification Management
router.get('/verifications', authenticateToken, authorizeRoles('admin', 'support'), adminController.getVerifications);
router.post('/verifications/review', authenticateToken, authorizeRoles('admin', 'support'), adminController.reviewVerification);

// Financial Management
const walletController = require('../controllers/walletController');
router.get('/finance/transactions', authenticateToken, authorizeRoles('admin'), walletController.getAllTransactions);
router.get('/finance/stats', authenticateToken, authorizeRoles('admin'), walletController.getAdminFinancialStats);
router.post('/finance/withdrawals/review', authenticateToken, authorizeRoles('admin'), walletController.reviewWithdrawal);

// System Settings
router.get('/settings', authenticateToken, authorizeRoles('admin'), adminController.getSettings);
router.post('/settings', authenticateToken, authorizeRoles('admin'), adminController.updateSettings);

// Global Communications
router.post('/notifications/broadcast', authenticateToken, authorizeRoles('admin'), adminController.sendBroadcast);

module.exports = router;
