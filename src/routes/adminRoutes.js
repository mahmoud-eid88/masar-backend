const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Added


// Dashboard statistics
router.get('/stats', adminController.getDashboardStats);
router.get('/stats/growth', authenticateToken, adminController.getReferralStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/couriers', adminController.getAllCouriers);
router.post('/users/update-role', adminController.updateUserRole);

// Recent orders
router.get('/orders/recent', adminController.getRecentOrders);

// Identity Verification Management
router.get('/verifications', authenticateToken, adminController.getVerifications);
router.post('/verifications/review', authenticateToken, adminController.reviewVerification);

// Financial Management
const walletController = require('../controllers/walletController');
router.get('/finance/transactions', authenticateToken, walletController.getAllTransactions);
router.post('/finance/withdrawals/review', authenticateToken, walletController.reviewWithdrawal);

module.exports = router;
