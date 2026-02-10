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
    getCourierOrderHistory,
    checkOrderRating,
    proposePrice,
    respondToProposal,
    estimatePrice,
    validatePromo,
    updateDestinationProgress
} = require('../controllers/orderController');

const { validate, schemas } = require('../middlewares/validationMiddleware');

router.get('/estimate', estimatePrice); // [NEW] Smart Pricing Endpoint
router.post('/validate-promo', validatePromo); // [NEW] Promo Validation Endpoint
router.patch('/:order_id/destination-progress', updateDestinationProgress); // [NEW] Multi-stop progress
router.post('/', validate(schemas.order.create), createOrder);
router.post('/create', validate(schemas.order.create), createOrder); // 🩹 FIX: Alias for mobile app
router.post('/:order_id/accept', acceptOrder);
router.patch('/:order_id/status', updateOrderStatus);
router.get('/nearby', getNearbyOrders);
router.get('/active', getCustomerOrders); // Alias for backwards compatibility
router.get('/customer/:customer_id', getCustomerOrders);
router.get('/customer/:customer_id/history', getCustomerOrderHistory);
router.get('/courier/:courier_id/history', getCourierOrderHistory);
router.get('/admin/all', getAllOrders);
router.get('/accepted/:courier_id', getAcceptedOrders);
router.post('/:order_id/rate', rateOrder);
router.get('/:order_id/rating', checkOrderRating);
router.get('/:order_id', getOrderDetails);

// Negotiation
router.post('/:order_id/propose', proposePrice);
router.post('/:order_id/respond', respondToProposal);

module.exports = router;

