const express = require('express');
const router = express.Router();
const {
    createOrder,
    acceptOrder,
    updateOrderStatus,
    getNearbyOrders,
    getCustomerOrders,
    getAllOrders
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/create', createOrder); // 🩹 FIX: Alias for mobile app
router.post('/:order_id/accept', acceptOrder);
router.patch('/:order_id/status', updateOrderStatus);
router.get('/nearby', getNearbyOrders);
router.get('/customer/:customer_id', getCustomerOrders);
router.get('/admin/all', getAllOrders);

module.exports = router;
