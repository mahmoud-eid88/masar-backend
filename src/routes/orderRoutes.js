const express = require('express');
const router = express.Router();
const {
    createOrder,
    acceptOrder,
    updateOrderStatus,
    getNearbyOrders
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/:order_id/accept', acceptOrder);
router.patch('/:order_id/status', updateOrderStatus);
router.get('/nearby', getNearbyOrders);

module.exports = router;
