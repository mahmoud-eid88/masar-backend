const express = require('express');
const router = express.Router();
const {
    createOrder,
    acceptOrder,
    updateOrderStatus,
    getNearbyOrders,
    getCustomerOrders,
    getAllOrders,
    getOrderDetails,
    getAcceptedOrders,
    rateOrder,
    getCustomerOrderHistory,
    checkOrderRating
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/create', createOrder); // 🩹 FIX: Alias for mobile app
router.post('/:order_id/accept', acceptOrder);
router.patch('/:order_id/status', updateOrderStatus);
router.get('/nearby', getNearbyOrders);
router.get('/customer/:customer_id', getCustomerOrders);
router.get('/customer/:customer_id/history', getCustomerOrderHistory);
router.get('/admin/all', getAllOrders);
router.get('/accepted/:courier_id', getAcceptedOrders);
router.post('/:order_id/rate', rateOrder);
router.get('/:order_id/rating', checkOrderRating);
router.get('/:order_id', getOrderDetails);

module.exports = router;

