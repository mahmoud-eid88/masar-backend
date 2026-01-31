const { Order, Customer, Courier, Wallet, Transaction } = require('../models');

exports.createOrder = async (req, res) => {
    try {
        const { customer_id, pickup_location, dropoff_location, details, price } = req.body;

        // pickup_location and dropoff_location should be { lat, lng } or similar
        // For Sequelize GEOMETRY, we need { type: 'Point', coordinates: [lng, lat] }

        const order = await Order.create({
            customer_id,
            pickup_latitude: pickup_location.lat,
            pickup_longitude: pickup_location.lng,
            dropoff_latitude: dropoff_location.lat,
            dropoff_longitude: dropoff_location.lng,
            details,
            price,
            status: 'waiting'
        });

        // Notify nearby couriers via Socket.io
        const io = req.app.get('io');
        io.emit('new_order', order);

        res.status(201).json({ success: true, order_id: order.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.acceptOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { courier_id } = req.body;

        const order = await Order.findByPk(order_id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.status !== 'waiting') {
            return res.status(400).json({ success: false, message: 'Order already taken' });
        }

        // Check if courier has < 4 orders
        const activeOrders = await Order.count({
            where: { courier_id, status: ['accepted', 'picked_up', 'in_delivery'] }
        });

        if (activeOrders >= 4) {
            return res.status(400).json({ success: false, message: 'You can only handle 4 orders at once' });
        }

        await order.update({ courier_id, status: 'accepted' });

        // Notify customer
        const io = req.app.get('io');
        io.to(`order_${order.id}`).emit('order_status_updated', { order_id, status: 'accepted' });

        res.json({ success: true, message: 'Order accepted' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status } = req.body;

        const order = await Order.findByPk(order_id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        await Order.sequelize.transaction(async (t) => {
            await order.update({ status }, { transaction: t });

            if (status === 'delivered' && order.courier_id) {
                // Credit Courier Wallet
                let wallet = await Wallet.findOne({
                    where: { user_id: order.courier_id, role: 'courier' },
                    transaction: t
                });

                if (!wallet) {
                    wallet = await Wallet.create({
                        user_id: order.courier_id,
                        role: 'courier',
                        balance: 0
                    }, { transaction: t });
                }

                wallet.balance = parseFloat(wallet.balance) + parseFloat(order.price);
                await wallet.save({ transaction: t });

                await Transaction.create({
                    wallet_id: wallet.id,
                    amount: order.price,
                    type: 'credit',
                    description: `Delivery earning for order #${order.id}`,
                    order_id: order.id
                }, { transaction: t });
            }
        });

        // Notify customer
        const io = req.app.get('io');
        io.to(`order_${order.id}`).emit('order_status_updated', { order_id, status });

        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getNearbyOrders = async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // radius in meters (not used in simple version)

        // For now, return all waiting orders. 
        // In a real app, we'd use Pythagoras or PostGIS.
        const orders = await Order.findAll({
            where: { status: 'waiting' },
            include: [{ model: Customer, attributes: ['name', 'phone'] }]
        });

        res.json({ success: true, orders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getCustomerOrders = async (req, res) => {
    try {
        const { customer_id } = req.params;
        const orders = await Order.findAll({
            where: { customer_id },
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
