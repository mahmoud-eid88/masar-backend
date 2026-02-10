const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

const { validate, schemas } = require('../middlewares/validationMiddleware');

router.get('/', walletController.getWallet);
router.get('/transactions/:wallet_id', walletController.getTransactions);
router.get('/summary/:wallet_id', walletController.getEarningsSummary);
router.get('/all-transactions', walletController.getAllTransactions);
router.post('/add-funds', validate(schemas.wallet.addFunds), walletController.addFunds);
router.post('/withdraw', validate(schemas.wallet.withdraw), walletController.withdrawFunds);
router.post('/review-withdrawal', validate(schemas.wallet.reviewWithdrawal), walletController.reviewWithdrawal);

module.exports = router;
