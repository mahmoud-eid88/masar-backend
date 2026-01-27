const { Message, Order } = require('../models');

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
        io.to(`order_${order_id}`).emit('new_message', message);

        res.status(201).json({ success: true, message });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

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
