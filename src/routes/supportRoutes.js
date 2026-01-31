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

module.exports = router;
