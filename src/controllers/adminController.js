const { Order, Courier, Customer, Admin } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalOrders = await Order.count();
        const todayOrders = await Order.count({
            where: {
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        const totalCustomers = await Customer.count();
        const totalCouriers = await Courier.count();
        const activeCouriers = await Courier.count({ where: { availability: true } });

        const pendingOrders = await Order.count({
            where: { status: 'waiting' }
        });

        const activeOrders = await Order.count({
            where: {
                status: {
                    [Op.in]: ['accepted', 'picked_up', 'in_delivery']
                }
            }
        });

        const deliveredOrders = await Order.count({
            where: { status: 'delivered' }
        });

        // Calculate total revenue (completed orders * price)
        const completedOrders = await Order.findAll({
            where: { status: 'delivered' },
            attributes: ['price']
        });

        const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

        // Today's revenue
        const todayDelivered = await Order.findAll({
            where: {
                status: 'delivered',
                updatedAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            attributes: ['price']
        });

        const todayRevenue = todayDelivered.reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

        res.json({
            success: true,
            stats: {
                totalOrders,
                todayOrders,
                totalCustomers,
                totalCouriers,
                activeCouriers,
                pendingOrders,
                activeOrders,
                deliveredOrders,
                totalStaff: await Admin.count(),
                totalRevenue: totalRevenue.toFixed(2),
                todayRevenue: todayRevenue.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { type, search } = req.query;

        let users = [];

        if (!type || type === 'all' || type === 'customers') {
            let customerWhere = {};
            if (search) {
                customerWhere = {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${search}%` } },
                        { phone: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } }
                    ]
                };
            }
            const customers = await Customer.findAll({
                where: customerWhere,
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });
            users = users.concat(customers.map(c => ({ ...c.toJSON(), role: 'customer' })));
        }

        if (!type || type === 'all' || type === 'couriers') {
            let courierWhere = {};
            if (search) {
                courierWhere = {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${search}%` } },
                        { phone: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } }
                    ]
                };
            }
            const couriers = await Courier.findAll({
                where: courierWhere,
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });
            users = users.concat(couriers.map(c => ({ ...c.toJSON(), role: 'courier' })));
        }

        if (!type || type === 'all' || type === 'staff') {
            let adminWhere = {};
            if (search) {
                adminWhere = {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } }
                    ]
                };
            }
            const staff = await Admin.findAll({
                where: adminWhere,
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });
            users = users.concat(staff.map(s => ({ ...s.toJSON() })));
        }

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllCouriers = async (req, res) => {
    try {
        const couriers = await Courier.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });

        // Get order counts for each courier
        const couriersWithStats = await Promise.all(couriers.map(async (courier) => {
            const completedOrders = await Order.count({
                where: {
                    courier_id: courier.id,
                    status: 'delivered'
                }
            });
            return {
                ...courier.toJSON(),
                completedOrders
            };
        }));

        res.json({
            success: true,
            couriers: couriersWithStats
        });
    } catch (error) {
        console.error('Get All Couriers Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getRecentOrders = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const orders = await Order.findAll({
            include: [
                { model: Customer, attributes: ['id', 'name', 'phone'] },
                { model: Courier, attributes: ['id', 'name', 'phone'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Get Recent Orders Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { userId, currentRole, targetRole } = req.body;

        let currentUser;
        if (currentRole === 'customer') {
            currentUser = await Customer.findByPk(userId);
        } else if (currentRole === 'courier') {
            currentUser = await Courier.findByPk(userId);
        }

        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if user already exists in target role
        let targetUser;
        if (targetRole === 'customer') {
            targetUser = await Customer.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                targetUser = await Customer.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone
                });
            }
        } else if (targetRole === 'courier') {
            targetUser = await Courier.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                targetUser = await Courier.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone,
                    availability: true
                });
            }
        } else if (targetRole === 'support') {
            targetUser = await Admin.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                targetUser = await Admin.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone,
                    role: 'support'
                });
            }
        }

        res.json({
            success: true,
            message: `User role changed to ${targetRole}`,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetRole
            }
        });
    } catch (error) {
        console.error('Update User Role Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
