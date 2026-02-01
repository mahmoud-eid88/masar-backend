const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Legacy routes
router.post('/send', chatController.sendMessage);
router.get('/:order_id', chatController.getOrderMessages);

// New order chat routes
router.get('/order/:orderId/info', chatController.getOrderChatInfo);
router.get('/order/:orderId/messages', chatController.getMessages);
router.post('/order/:orderId/send', chatController.sendOrderMessage);
router.post('/order/:orderId/read', chatController.markAsRead);

module.exports = router;

