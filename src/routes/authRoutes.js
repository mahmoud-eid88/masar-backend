const express = require('express');
const router = express.Router();
const {
    registerCustomer,
    loginCustomer,
    registerCourier,
    loginCourier,
    register,
    login,
    getReferralStats
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/referral-stats', getReferralStats);
router.post('/switch-role', require('../controllers/authController').switchRole);
router.post('/customer/register', registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/courier/register', registerCourier);
router.post('/courier/login', loginCourier);

module.exports = router;
