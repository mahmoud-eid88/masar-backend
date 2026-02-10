const { Order, Courier, Customer, Admin, Wallet, Transaction, SystemSetting, Notification } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

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
        const totalRevenue = await Order.sum('price', {
            where: { status: 'delivered' }
        }) || 0;

        // Today's revenue
        const todayRevenue = await Order.sum('price', {
            where: {
                status: 'delivered',
                updatedAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        }) || 0;

        // Monthly orders count
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const monthlyOrders = await Order.count({
            where: {
                createdAt: {
                    [Op.gte]: monthStart,
                    [Op.lt]: monthEnd
                }
            }
        });

        res.json({
            success: true,
            stats: {
                totalOrders,
                todayOrders,
                monthlyOrders,
                totalCustomers,
                totalCouriers,
                activeCouriers,
                pendingOrders,
                activeOrders,
                deliveredOrders,
                totalStaff: await Admin.count(),
                totalRevenue: parseFloat(totalRevenue).toFixed(2),
                todayRevenue: parseFloat(todayRevenue).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Helper to emit stats to socket
exports.emitDashboardStats = async (io) => {
    try {
        const { Order, Courier, Customer, Admin } = require('../models');
        const { Op } = require('sequelize');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalOrders = await Order.count();
        const todayOrders = await Order.count({
            where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } }
        });

        const totalCustomers = await Customer.count();
        const totalCouriers = await Courier.count();
        const activeCouriers = await Courier.count({ where: { availability: true } });

        const pendingOrders = await Order.count({ where: { status: 'waiting' } });
        const activeOrders = await Order.count({
            where: { status: { [Op.in]: ['accepted', 'picked_up', 'in_delivery'] } }
        });
        const deliveredOrders = await Order.count({ where: { status: 'delivered' } });

        const totalRevenue = await Order.sum('price', { where: { status: 'delivered' } }) || 0;
        const todayRevenue = await Order.sum('price', {
            where: {
                status: 'delivered',
                updatedAt: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
        }) || 0;

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const monthlyOrders = await Order.count({
            where: { createdAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd } }
        });

        io.to('admin_room').emit('dashboard_stats_updated', {
            totalOrders,
            todayOrders,
            monthlyOrders,
            totalCustomers,
            totalCouriers,
            activeCouriers,
            pendingOrders,
            activeOrders,
            deliveredOrders,
            totalStaff: await Admin.count(),
            totalRevenue: parseFloat(totalRevenue).toFixed(2),
            todayRevenue: parseFloat(todayRevenue).toFixed(2)
        });
    } catch (error) {
        console.error('Emit Dashboard Stats Error:', error);
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
        } else if (currentRole === 'admin' || currentRole === 'support') {
            currentUser = await Admin.findByPk(userId);
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
                    phone: currentUser.phone || ''
                });
            }
        } else if (targetRole === 'courier') {
            targetUser = await Courier.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                targetUser = await Courier.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone || '',
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
                    phone: currentUser.phone || '',
                    role: 'support'
                });
            } else {
                await targetUser.update({ role: 'support' });
            }
        } else if (targetRole === 'admin') {
            targetUser = await Admin.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                targetUser = await Admin.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone || '',
                    role: 'admin'
                });
            } else {
                await targetUser.update({ role: 'admin' });
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

exports.toggleUserBlock = async (req, res) => {
    try {
        const { userId, role } = req.body;

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        const newBlockStatus = !user.is_blocked;
        await user.update({ is_blocked: newBlockStatus });

        res.json({
            success: true,
            message: newBlockStatus ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم',
            is_blocked: newBlockStatus
        });
    } catch (error) {
        console.error('Toggle User Block Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getVerifications = async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const customers = await Customer.findAll({
            where: { verification_status: status },
            attributes: { exclude: ['password'] }
        });

        const couriers = await Courier.findAll({
            where: { verification_status: status },
            attributes: { exclude: ['password'] }
        });

        const requests = [
            ...customers.map(c => ({ ...c.toJSON(), role: 'customer' })),
            ...couriers.map(c => ({ ...c.toJSON(), role: 'courier' }))
        ];

        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get Verifications Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.reviewVerification = async (req, res) => {
    try {
        const { userId, role, status, refusalReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
        }

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        await user.update({
            verification_status: status,
            verification_refusal_reason: status === 'rejected' ? refusalReason : null
        });

        // Phase 9: Integrated Notifications
        const title = status === 'approved' ? 'تهانينا! تم توثيق حسابك 🎉' : 'عذراً! تم رفض طلب التوثيق ⚠️';
        const messageBody = status === 'approved'
            ? 'تمت مراجعة مستنداتك وتوثيق حسابك بنجاح. يمكنك الآن الاستمتاع بكامل ميزات المنصة.'
            : `تم رفض طلب التوثيق للسبب التالي: ${refusalReason || 'مستندات غير واضحة'}. يرجى المحاولة مرة أخرى.`;

        // 1. Create In-App Notification Record
        await Notification.create({
            user_id: userId,
            role: role,
            type: 'IDENTITY_VERIFICATION',
            title: title,
            message: messageBody,
            data: { status, refusalReason }
        });

        // 2. Send Push Notification
        await notificationService.sendPushNotification(
            userId,
            role,
            title,
            messageBody,
            { type: 'IDENTITY_VERIFICATION', status }
        );

        res.json({
            success: true,
            message: status === 'approved' ? 'تم توثيق الحساب بنجاح' : 'تم رفض طلب التوثيق'
        });
    } catch (error) {
        console.error('Review Verification Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.findAll({
            order: [['key', 'ASC']]
        });
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body; // Array of { key, value }

        for (const item of settings) {
            await SystemSetting.upsert({
                key: item.key,
                value: item.value.toString()
            });
        }

        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getReferralStats = async (req, res) => {
    try {
        const totalReferrals = await Customer.count({
            where: { referred_by_id: { [Op.ne]: null } }
        }) + await Courier.count({
            where: { referred_by_id: { [Op.ne]: null } }
        });

        const totalRewards = await Transaction.sum('amount', {
            where: { description: { [Op.like]: '%مكافأة دعوة صديق%' } }
        }) || 0;

        // Enhanced Influencers Logic
        const topCustomerReferrers = await Customer.findAll({
            attributes: [
                'id', 'name', 'phone', 'image_url',
                [require('sequelize').literal('(SELECT COUNT(*) FROM customers WHERE referred_by_id = "Customer"."id")'), 'referralCount']
            ],
            where: {
                id: {
                    [Op.in]: require('sequelize').literal('(SELECT DISTINCT referred_by_id FROM customers WHERE referred_by_id IS NOT NULL)')
                }
            },
            order: [[require('sequelize').literal('"referralCount"'), 'DESC']],
            limit: 5
        });

        const topCourierReferrers = await Courier.findAll({
            attributes: [
                'id', 'name', 'phone', 'image_url',
                [require('sequelize').literal('(SELECT COUNT(*) FROM couriers WHERE referred_by_id = "Courier"."id")'), 'referralCount']
            ],
            where: {
                id: {
                    [Op.in]: require('sequelize').literal('(SELECT DISTINCT referred_by_id FROM couriers WHERE referred_by_id IS NOT NULL)')
                }
            },
            order: [[require('sequelize').literal('"referralCount"'), 'DESC']],
            limit: 5
        });

        const influencers = [
            ...topCustomerReferrers.map(c => ({ ...c.get(), role: 'customer' })),
            ...topCourierReferrers.map(c => ({ ...c.get(), role: 'courier' }))
        ].sort((a, b) => b.referralCount - a.referralCount);

        res.json({
            success: true,
            stats: {
                totalReferrals,
                totalRewards: parseFloat(totalRewards).toFixed(2),
                topReferrers: influencers
            }
        });
    } catch (error) {
        console.error('Get Referral Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.getChartStats = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Generate date series
        const dateSeries = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dateSeries.push(new Date(d).toISOString().split('T')[0]);
        }

        const chartData = await Promise.all(dateSeries.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const orderCount = await Order.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(date),
                        [Op.lt]: nextDay
                    }
                }
            });

            const revenue = await Order.sum('price', {
                where: {
                    status: 'delivered',
                    updatedAt: {
                        [Op.gte]: new Date(date),
                        [Op.lt]: nextDay
                    }
                }
            }) || 0;

            return {
                date,
                orders: orderCount,
                revenue: parseFloat(revenue).toFixed(2)
            };
        }));

        res.json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('Get Chart Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


exports.sendBroadcast = async (req, res) => {
    try {
        const { target, title, body, data } = req.body;

        if (!target || !title || !body) {
            return res.status(400).json({ success: false, error: 'Target, title and body are required' });
        }

        const result = await notificationService.sendBroadcastNotification(target, title, body, data);

        if (result.success) {
            res.json({
                success: true,
                message: `Broadcast sent to ${result.count} devices`
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Send Broadcast Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
