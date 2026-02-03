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

const { validate, schemas } = require('../middlewares/validationMiddleware');

router.post('/register', validate(schemas.auth.register), register);
router.post('/login', validate(schemas.auth.login), login);
router.get('/referral-stats', getReferralStats);
router.post('/switch-role', require('../controllers/authController').switchRole);
router.post('/customer/register', registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/courier/register', registerCourier);
router.post('/courier/login', loginCourier);

module.exports = router;
