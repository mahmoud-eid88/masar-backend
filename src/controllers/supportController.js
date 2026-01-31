const SupportMessage = require('../models/SupportMessage');
const { Order, Customer, Courier } = require('../models');
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
        // Get unique users with their latest message
        const users = await SupportMessage.findAll({
            attributes: ['user_id', 'user_name', 'user_role', 'status'],
            group: ['user_id', 'user_name', 'user_role', 'status'],
            order: [['createdAt', 'DESC']]
        });

        // Get message count and last message for each user
        const tickets = await Promise.all(users.map(async (user) => {
            const lastMessage = await SupportMessage.findOne({
                where: { user_id: user.user_id },
                order: [['createdAt', 'DESC']]
            });
            const messageCount = await SupportMessage.count({
                where: { user_id: user.user_id }
            });
            const unreadCount = await SupportMessage.count({
                where: { user_id: user.user_id, is_support: false, status: 'open' }
            });

            return {
                user_id: user.user_id,
                user_name: user.user_name,
                user_role: user.user_role,
                status: user.status,
                lastMessage: lastMessage?.content,
                lastMessageTime: lastMessage?.createdAt,
                messageCount,
                unreadCount
            };
        }));

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
