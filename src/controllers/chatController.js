const { Message, Order, Customer, Courier, OrderMessage } = require('../models');

// Legacy: Send message using Message model
exports.sendMessage = async (req, res) => {
    try {
        const { order_id, sender_id, sender_role, content } = req.body;

        const message = await Message.create({
            order_id,
            sender_id,
            sender_role,
            content
        });

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`order_${order_id}`).emit('new_message', message);
        }

        res.status(201).json({ success: true, message });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Legacy: Get messages using Message model
exports.getOrderMessages = async (req, res) => {
    try {
        const { order_id } = req.params;
        const messages = await Message.findAll({
            where: { order_id },
            order: [['createdAt', 'ASC']]
        });
        res.json({ success: true, messages });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// NEW: Get messages for an order using OrderMessage model
exports.getMessages = async (req, res) => {
    try {
        const { orderId } = req.params;

        const messages = await OrderMessage.findAll({
            where: { order_id: orderId },
            order: [['createdAt', 'ASC']]
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Send a message using OrderMessage model
exports.sendOrderMessage = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { sender_id, sender_role, sender_name, content } = req.body;

        const message = await OrderMessage.create({
            order_id: orderId,
            sender_id,
            sender_role,
            sender_name,
            content
        });

        // Emit socket event for real-time
        if (req.app.get('io')) {
            req.app.get('io').to(`order_${orderId}`).emit('new_message', message);
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Get order chat info (order details with customer/courier info)
exports.getOrderChatInfo = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findByPk(orderId, {
            include: [
                { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
                { model: Courier, attributes: ['id', 'name', 'phone', 'email', 'rating'] }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Get Order Chat Info Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Get unread message count for a specific order
exports.getUnreadCount = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { role } = req.query; // 'customer' or 'courier'

        // Count messages from the OTHER party that are unread
        const senderRole = role === 'customer' ? 'courier' : 'customer';

        const count = await OrderMessage.count({
            where: { order_id: orderId, sender_role: senderRole, is_read: false }
        });

        res.json({ success: true, unread: count });
    } catch (error) {
        console.error('Get Unread Count Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Get unread counts for all active orders of a user
exports.getUnreadCounts = async (req, res) => {
    try {
        const { userId, role } = req.query;
        if (!userId || !role) {
            return res.status(400).json({ success: false, message: 'userId and role required' });
        }

        const whereClause = role === 'customer'
            ? { customer_id: userId, status: ['accepted', 'picked_up', 'in_delivery'] }
            : { courier_id: userId, status: ['accepted', 'picked_up', 'in_delivery'] };

        const activeOrders = await Order.findAll({
            where: whereClause,
            attributes: ['id'],
        });

        const senderRole = role === 'customer' ? 'courier' : 'customer';
        const results = {};

        for (const order of activeOrders) {
            const count = await OrderMessage.count({
                where: { order_id: order.id, sender_role: senderRole, is_read: false }
            });
            if (count > 0) {
                results[order.id] = count;
            }
        }

        res.json({ success: true, unread: results });
    } catch (error) {
        console.error('Get Unread Counts Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reader_role } = req.body;

        // Mark messages from the other party as read
        const senderRole = reader_role === 'customer' ? 'courier' : 'customer';

        await OrderMessage.update(
            { is_read: true },
            { where: { order_id: orderId, sender_role: senderRole } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark As Read Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
