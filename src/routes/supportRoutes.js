const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { requireSupportRole, requireAdmin } = require('../middlewares/rbacMiddleware');

// ===================================
// USER ROUTES (Customer/Courier)
// ===================================
router.get('/messages/:userId', supportController.getMessages);
router.post('/send', supportController.sendMessage);
router.post('/tickets/request', supportController.createTicket); // NEW: Create support ticket

// ===================================
// SUPPORT AGENT ROUTES
// ===================================
router.post('/reply', requireSupportRole, supportController.replyMessage);
router.get('/tickets', requireSupportRole, supportController.getAllTickets);
router.get('/order/:orderId', requireSupportRole, supportController.getOrderDetailsForSupport);
router.patch('/ticket/:userId/status', requireSupportRole, supportController.updateTicketStatus);

// User details and notes for support  
router.get('/user/:role/:userId', requireSupportRole, supportController.getUserDetails);
router.patch('/user/:role/:userId/notes', requireSupportRole, supportController.updateSupportNotes);

// Order search
router.get('/orders/search', requireSupportRole, supportController.searchOrders);

// ===================================
// NEW TICKET WORKFLOW ROUTES
// ===================================
router.get('/tickets/queue', requireSupportRole, supportController.getTicketQueue);
router.get('/tickets/agent/:agentId', requireSupportRole, supportController.getAgentTickets);
router.post('/tickets/:ticketId/assign', requireSupportRole, supportController.assignTicket);
router.patch('/tickets/:ticketId/status', requireSupportRole, supportController.updateTicketStatusNew);
router.get('/tickets/:ticketId/messages', requireSupportRole, supportController.getTicketMessages);
router.post('/tickets/:ticketId/messages', requireSupportRole, supportController.sendTicketMessage);

// ===================================
// ADMIN ONLY ROUTES
// ===================================
router.get('/audit-logs', requireAdmin, supportController.getAuditLogs);

module.exports = router;
