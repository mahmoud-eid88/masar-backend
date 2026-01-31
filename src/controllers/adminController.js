const { Order, Courier, Customer } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalOrders = await Order.count();
        const activeCouriers = await Courier.count({ where: { availability: true } });
        const pendingOrders = await Order.count({
            where: {
                status: ['waiting', 'accepted', 'picked_up', 'in_delivery']
            }
        });

        // Calculate total revenue (completed orders * price)
        const completedOrders = await Order.findAll({
            where: { status: 'delivered' },
            attributes: ['price']
        });

        const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

        res.json({
            success: true,
            stats: {
                totalOrders,
                activeCouriers,
                pendingOrders,
                totalRevenue: totalRevenue.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
