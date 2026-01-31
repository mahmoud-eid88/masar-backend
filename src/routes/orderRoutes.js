const express = require('express');
const router = express.Router();
const {
    createOrder,
    acceptOrder,
    updateOrderStatus,
    getNearbyOrders
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/create', createOrder); // 🩹 FIX: Alias for mobile app which calls /create
router.post('/:order_id/accept', acceptOrder);
router.patch('/:order_id/status', updateOrderStatus);
router.get('/nearby', getNearbyOrders);

module.exports = router;
