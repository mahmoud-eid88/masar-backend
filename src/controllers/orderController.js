const { Order, Customer, Courier, Wallet, Transaction, Rating } = require('../models');

exports.createOrder = async (req, res) => {
    try {
        const { customer_id, pickup_location, dropoff_location, details, price, courier_id } = req.body;

        // pickup_location and dropoff_location should be { lat, lng } or similar
        // For Sequelize GEOMETRY, we need { type: 'Point', coordinates: [lng, lat] }

        // Check active orders limit for customer (max 4)
        const activeOrdersCount = await Order.count({
            where: {
                customer_id,
                status: ['waiting', 'accepted', 'picked_up', 'in_delivery']
            }
        });

        if (activeOrdersCount >= 4) {
            return res.status(400).json({
                success: false,
                error: 'Cannot create more than 4 active orders simultaneously'
            });
        }

        const order = await Order.create({
            customer_id,
            courier_id: courier_id || null, // Allow specific assignment
            pickup_latitude: pickup_location.lat,
            pickup_longitude: pickup_location.lng,
            dropoff_latitude: dropoff_location.lat,
            dropoff_longitude: dropoff_location.lng,
            details,
            price,
            status: 'waiting' // Always waiting initially, even if specific courier (courier must accept)
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
        const { lat, lng, courier_id } = req.query;

        // Return waiting orders that are either:
        // 1. Broadcast (courier_id is null)
        // 2. Assigned specifically to this courier
        const whereClause = {
            status: 'waiting'
        };

        if (courier_id) {
            const { Op } = require('sequelize');
            whereClause[Op.or] = [
                { courier_id: null },
                { courier_id: courier_id }
            ];
        } else {
            whereClause.courier_id = null;
        }

        const orders = await Order.findAll({
            where: whereClause,
            include: [{ model: Customer, attributes: ['name', 'phone'] }]
        });

        // If lat/lng provided, calculate distance and sort
        let sortedOrders = orders;
        if (lat && lng) {
            sortedOrders = orders.map(order => {
                const distance = calculateDistance(
                    parseFloat(lat),
                    parseFloat(lng),
                    parseFloat(order.pickup_latitude),
                    parseFloat(order.pickup_longitude)
                );
                return {
                    ...order.toJSON(),
                    distance: parseFloat(distance.toFixed(2))
                };
            }).sort((a, b) => a.distance - b.distance);
        }

        res.json({ success: true, orders: sortedOrders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

exports.getAcceptedOrders = async (req, res) => {
    try {
        const { courier_id } = req.params;
        const orders = await Order.findAll({
            where: {
                courier_id,
                status: ['accepted', 'picked_up', 'in_delivery']
            },
            include: [{ model: Customer, attributes: ['name', 'phone'] }],
            order: [['updatedAt', 'DESC']]
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
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: Customer, attributes: ['name', 'phone'] },
                { model: Courier, attributes: ['name', 'phone'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        const { order_id } = req.params;
        const order = await Order.findByPk(order_id, {
            include: [
                { model: Customer, attributes: ['name', 'phone'] },
                { model: Courier, attributes: ['name', 'phone', 'latitude', 'longitude'] }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Rate a delivered order
exports.rateOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { customer_id, rating, comment } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'التقييم يجب أن يكون بين 1 و 5'
            });
        }

        // Get the order
        const order = await Order.findByPk(order_id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تقييم طلب غير مكتمل'
            });
        }

        if (!order.courier_id) {
            return res.status(400).json({
                success: false,
                message: 'لا يوجد مندوب لهذا الطلب'
            });
        }

        // Check if already rated
        const existingRating = await Rating.findOne({ where: { order_id } });
        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'تم تقييم هذا الطلب مسبقاً'
            });
        }

        // Create rating
        await Rating.create({
            order_id,
            customer_id,
            courier_id: order.courier_id,
            rating,
            comment
        });

        // Update courier average rating
        const courier = await Courier.findByPk(order.courier_id);
        if (courier) {
            const newTotalRatings = courier.total_ratings + 1;
            const newAvgRating = ((courier.rating * courier.total_ratings) + rating) / newTotalRatings;

            await courier.update({
                rating: parseFloat(newAvgRating.toFixed(2)),
                total_ratings: newTotalRatings
            });
        }

        res.json({
            success: true,
            message: 'شكراً لتقييمك!'
        });
    } catch (error) {
        console.error('Rate Order Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get customer's completed orders (order history)
exports.getCustomerOrderHistory = async (req, res) => {
    try {
        const { customer_id } = req.params;

        const orders = await Order.findAll({
            where: {
                customer_id,
                status: 'delivered'
            },
            include: [
                {
                    model: Courier,
                    attributes: ['id', 'name', 'phone', 'rating']
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        // Get ratings for these orders
        const orderIds = orders.map(o => o.id);
        const ratings = await Rating.findAll({
            where: { order_id: orderIds }
        });

        // Map ratings to orders
        const ordersWithRatings = orders.map(order => {
            const orderRating = ratings.find(r => r.order_id === order.id);
            return {
                ...order.toJSON(),
                my_rating: orderRating ? orderRating.rating : null
            };
        });

        res.json({ success: true, orders: ordersWithRatings });
    } catch (error) {
        console.error('Get Customer Order History Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Check if order needs rating
exports.checkOrderRating = async (req, res) => {
    try {
        const { order_id } = req.params;

        const order = await Order.findByPk(order_id, {
            include: [
                { model: Courier, attributes: ['id', 'name', 'rating'] }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        const existingRating = await Rating.findOne({ where: { order_id } });

        res.json({
            success: true,
            needs_rating: order.status === 'delivered' && !existingRating,
            order: order.toJSON(),
            rated: !!existingRating,
            rating: existingRating ? existingRating.rating : null
        });
    } catch (error) {
        console.error('Check Order Rating Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
