const SupportMessage = require('../models/SupportMessage');
const SupportAuditLog = require('../models/SupportAuditLog');
const { Order, Customer, Courier, SupportTicket, Admin } = require('../models');
const { Op } = require('sequelize');

// Get support messages for a user
exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const messages = await SupportMessage.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'ASC']]
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get Support Messages Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send support message
exports.sendMessage = async (req, res) => {
    try {
        const { user_id, user_role, user_name, content, related_order_id } = req.body;

        const message = await SupportMessage.create({
            user_id,
            user_role,
            user_name,
            content,
            is_support: false,
            related_order_id: related_order_id || null
        });

        // Emit socket event for real-time
        if (req.app.get('io')) {
            req.app.get('io').to(`support_${user_id}`).emit('support_message', message);
            req.app.get('io').to('support_agents').emit('new_support_message', message);
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Send Support Message Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Support agent reply
exports.replyMessage = async (req, res) => {
    try {
        const { user_id, content, support_agent_id } = req.body;

        const message = await SupportMessage.create({
            user_id,
            user_role: 'support',
            user_name: 'فريق الدعم',
            content,
            is_support: true,
            support_agent_id
        });

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(`support_${user_id}`).emit('support_message', message);
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Reply Support Message Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all support tickets for support agents
exports.getAllTickets = async (req, res) => {
    try {
        const { QueryTypes } = require('sequelize');

        // Optimized query to get all ticket stats in one go
        const tickets = await SupportMessage.sequelize.query(`
            SELECT 
                user_id,
                user_name,
                user_role,
                MAX(CASE WHEN status IS NOT NULL THEN status ELSE 'open' END) as status,
                MAX("createdAt") as "lastMessageTime",
                (SELECT content FROM "SupportMessages" sm2 WHERE sm2.user_id = sm.user_id ORDER BY sm2."createdAt" DESC LIMIT 1) as "lastMessage",
                COUNT(*) as "messageCount",
                COUNT(CASE WHEN is_support = false AND status = 'open' THEN 1 END) as "unreadCount"
            FROM "SupportMessages" as sm
            GROUP BY user_id, user_name, user_role
            ORDER BY "lastMessageTime" DESC
        `, { type: QueryTypes.SELECT });

        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get All Tickets Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get order details for support (with more info)
exports.getOrderDetailsForSupport = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findByPk(orderId, {
            include: [
                { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
                { model: Courier, attributes: ['id', 'name', 'email', 'phone', 'availability', 'rating'] }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        // Get support history for this order
        const supportHistory = await SupportMessage.findAll({
            where: { related_order_id: orderId },
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json({
            success: true,
            order,
            supportHistory
        });
    } catch (error) {
        console.error('Get Order Details For Support Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update ticket status
exports.updateTicketStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        await SupportMessage.update(
            { status },
            { where: { user_id: userId } }
        );

        res.json({ success: true, message: 'تم تحديث الحالة' });
    } catch (error) {
        console.error('Update Ticket Status Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user details for support (with order history)
exports.getUserDetails = async (req, res) => {
    try {
        const { userId, role } = req.params;

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Get user's orders
        const orders = await Order.findAll({
            where: role === 'customer'
                ? { customer_id: userId }
                : { courier_id: userId },
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        // Get support history
        const supportHistory = await SupportMessage.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        res.json({
            success: true,
            user,
            orders,
            supportHistory,
            orderCount: await Order.count({
                where: role === 'customer'
                    ? { customer_id: userId }
                    : { courier_id: userId }
            })
        });
    } catch (error) {
        console.error('Get User Details Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update support notes for a user
exports.updateSupportNotes = async (req, res) => {
    try {
        const { userId, role } = req.params;
        const { notes } = req.body;

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        await user.update({ support_notes: notes });

        res.json({ success: true, message: 'تم حفظ الملاحظات' });
    } catch (error) {
        console.error('Update Support Notes Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Search orders by order_code, ID, customer name, or phone
exports.searchOrders = async (req, res) => {
    try {
        const { query } = req.query;

        const orders = await Order.findAll({
            where: {
                [Op.or]: [
                    { order_code: { [Op.iLike]: `%${query}%` } },
                    { id: isNaN(query) ? 0 : parseInt(query) },
                    { '$Customer.name$': { [Op.iLike]: `%${query}%` } },
                    { '$Customer.phone$': { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
                { model: Courier, attributes: ['id', 'name', 'phone', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json({ success: true, orders });
    } catch (error) {
        console.error('Search Orders Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ===================================
// NEW TICKET WORKFLOW ENDPOINTS
// ===================================

// Create a support ticket (User requests help)
exports.createTicket = async (req, res) => {
    try {
        const { user_id, user_type, subject, description, priority, related_order_id } = req.body;

        // Get user info
        let user;
        if (user_type === 'customer') {
            user = await Customer.findByPk(user_id, { attributes: ['id', 'name', 'phone', 'rating'] });
        } else {
            user = await Courier.findByPk(user_id, { attributes: ['id', 'name', 'phone', 'rating'] });
        }

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Create ticket
        const ticket = await SupportTicket.create({
            subject: subject || 'طلب دعم جديد',
            description: description || '',
            status: 'open',
            priority: priority || 'medium',
            user_type,
            user_id,
            last_activity_at: new Date()
        });

        // Create initial message if description provided
        if (description) {
            await SupportMessage.create({
                ticket_id: ticket.id,
                user_id,
                user_role: user_type,
                user_name: user.name,
                content: description,
                is_support: false,
                related_order_id
            });
        }

        // Emit to support agents
        if (req.app.get('io')) {
            req.app.get('io').to('support_agents').emit('new_support_ticket', {
                ticket,
                user: { name: user.name, phone: user.phone, rating: user.rating }
            });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get unassigned tickets (queue)
exports.getTicketQueue = async (req, res) => {
    try {
        const tickets = await SupportTicket.findAll({
            where: {
                assigned_agent_id: null,
                status: { [Op.in]: ['open', 'in_progress'] }
            },
            order: [
                ['priority', 'DESC'],
                ['createdAt', 'ASC']
            ]
        });

        // Attach user info and last message
        const ticketsWithInfo = await Promise.all(tickets.map(async (ticket) => {
            let user;
            if (ticket.user_type === 'customer') {
                user = await Customer.findByPk(ticket.user_id, { attributes: ['name', 'phone', 'rating'] });
            } else {
                user = await Courier.findByPk(ticket.user_id, { attributes: ['name', 'phone', 'rating'] });
            }

            const lastMessage = await SupportMessage.findOne({
                where: { ticket_id: ticket.id },
                order: [['createdAt', 'DESC']]
            });

            return {
                ...ticket.toJSON(),
                user,
                lastMessage: lastMessage?.content?.substring(0, 100),
                lastMessageTime: lastMessage?.createdAt
            };
        }));

        res.json({ success: true, tickets: ticketsWithInfo });
    } catch (error) {
        console.error('Get Ticket Queue Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get tickets assigned to agent
exports.getAgentTickets = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { status } = req.query;

        const whereClause = { assigned_agent_id: agentId };
        if (status) {
            whereClause.status = status;
        }

        const tickets = await SupportTicket.findAll({
            where: whereClause,
            order: [['last_activity_at', 'DESC']]
        });

        // Attach user info
        const ticketsWithInfo = await Promise.all(tickets.map(async (ticket) => {
            let user;
            if (ticket.user_type === 'customer') {
                user = await Customer.findByPk(ticket.user_id, { attributes: ['name', 'phone', 'rating'] });
            } else {
                user = await Courier.findByPk(ticket.user_id, { attributes: ['name', 'phone', 'rating'] });
            }

            const unreadCount = await SupportMessage.count({
                where: { ticket_id: ticket.id, is_support: false, status: 'open' }
            });

            return { ...ticket.toJSON(), user, unreadCount };
        }));

        res.json({ success: true, tickets: ticketsWithInfo });
    } catch (error) {
        console.error('Get Agent Tickets Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Assign ticket to self
exports.assignTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { agent_id, agent_name } = req.body;

        const ticket = await SupportTicket.findByPk(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        if (ticket.assigned_agent_id && ticket.assigned_agent_id !== parseInt(agent_id)) {
            return res.status(400).json({ success: false, error: 'Ticket already assigned to another agent' });
        }

        await ticket.update({
            assigned_agent_id: agent_id,
            assigned_agent_name: agent_name,
            assigned_at: new Date(),
            status: ticket.status === 'open' ? 'in_progress' : ticket.status
        });

        // Create audit log
        await SupportAuditLog.create({
            ticket_id: ticketId,
            agent_id,
            agent_name,
            action: 'assigned',
            new_value: agent_name,
            metadata: { previous_status: ticket.status }
        });

        // Emit event
        if (req.app.get('io')) {
            req.app.get('io').to('support_agents').emit('ticket_assigned', {
                ticketId,
                agent_id,
                agent_name
            });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Assign Ticket Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update ticket status (with audit log)
exports.updateTicketStatusNew = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, agent_id, agent_name } = req.body;

        const ticket = await SupportTicket.findByPk(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const oldStatus = ticket.status;
        const updateData = { status, last_activity_at: new Date() };

        if (status === 'resolved' || status === 'closed') {
            updateData.resolved_at = new Date();
        }

        await ticket.update(updateData);

        // Create audit log
        await SupportAuditLog.create({
            ticket_id: ticketId,
            agent_id,
            agent_name,
            action: 'status_changed',
            old_value: oldStatus,
            new_value: status
        });

        // Emit event
        if (req.app.get('io')) {
            req.app.get('io').to(`ticket_${ticketId}`).emit('ticket_status_changed', {
                ticketId,
                oldStatus,
                newStatus: status
            });
        }

        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Update Ticket Status Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get ticket messages
exports.getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const messages = await SupportMessage.findAll({
            where: { ticket_id: ticketId },
            order: [['createdAt', 'ASC']]
        });

        // Get ticket info
        const ticket = await SupportTicket.findByPk(ticketId);

        res.json({ success: true, messages, ticket });
    } catch (error) {
        console.error('Get Ticket Messages Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send message to ticket
exports.sendTicketMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, sender_id, sender_role, sender_name, is_support, agent_id, agent_name } = req.body;

        const ticket = await SupportTicket.findByPk(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const message = await SupportMessage.create({
            ticket_id: ticketId,
            user_id: sender_id,
            user_role: sender_role,
            user_name: sender_name,
            content,
            is_support: is_support || false,
            support_agent_id: is_support ? agent_id : null
        });

        // Update ticket activity
        await ticket.update({ last_activity_at: new Date() });

        // Create audit log for agent replies
        if (is_support) {
            await SupportAuditLog.create({
                ticket_id: ticketId,
                agent_id,
                agent_name,
                action: 'replied',
                message_content: content.substring(0, 200)
            });
        }

        // Emit to ticket room
        if (req.app.get('io')) {
            req.app.get('io').to(`ticket_${ticketId}`).emit('ticket_message', message);

            // If user sent message, notify agents
            if (!is_support) {
                req.app.get('io').to('support_agents').emit('ticket_new_message', {
                    ticketId,
                    message
                });
            }
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Send Ticket Message Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get audit logs (Admin only)
exports.getAuditLogs = async (req, res) => {
    try {
        const { ticketId, agentId, startDate, endDate, limit = 100 } = req.query;

        const whereClause = {};
        if (ticketId) whereClause.ticket_id = ticketId;
        if (agentId) whereClause.agent_id = agentId;
        if (startDate && endDate) {
            whereClause.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const logs = await SupportAuditLog.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            include: [{
                model: SupportTicket,
                attributes: ['id', 'subject', 'user_type', 'user_id']
            }]
        });

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
