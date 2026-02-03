const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/', walletController.getWallet);
router.get('/transactions/:wallet_id', walletController.getTransactions);
router.get('/summary/:wallet_id', walletController.getEarningsSummary);
router.get('/all-transactions', walletController.getAllTransactions);
router.post('/add-funds', walletController.addFunds);
router.post('/withdraw', walletController.withdrawFunds);
router.post('/review-withdrawal', walletController.reviewWithdrawal);

module.exports = router;
