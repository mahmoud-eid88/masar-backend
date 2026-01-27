const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/', walletController.getWallet);
router.get('/transactions/:wallet_id', walletController.getTransactions);
router.post('/add-funds', walletController.addFunds);

module.exports = router;
