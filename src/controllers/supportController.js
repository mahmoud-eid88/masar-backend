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
