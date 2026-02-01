const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// User routes
router.get('/messages/:userId', supportController.getMessages);
router.post('/send', supportController.sendMessage);

// Support agent routes
router.post('/reply', supportController.replyMessage);
router.get('/tickets', supportController.getAllTickets);
router.get('/order/:orderId', supportController.getOrderDetailsForSupport);
router.patch('/ticket/:userId/status', supportController.updateTicketStatus);

// User details and notes for support
router.get('/user/:role/:userId', supportController.getUserDetails);
router.patch('/user/:role/:userId/notes', supportController.updateSupportNotes);

// Order search
router.get('/orders/search', supportController.searchOrders);

module.exports = router;
