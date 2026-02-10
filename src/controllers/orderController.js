const { Order, Customer, Courier, Wallet, Transaction, Rating, Notification, NegotiationLog, OrderMessage } = require('../models');
const pricingService = require('../services/pricingService');
const referralService = require('../services/referralService');
const pushService = require('../services/notificationService');
const geofenceService = require('../services/geofenceService');
const adminController = require('./adminController');

exports.estimatePrice = async (req, res) => {
    try {
        const { pickupLat, pickupLng, dropoffLat, dropoffLng, destinations, promoCode } = req.query;

        // Validate
        if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
            return res.status(400).json({
                success: false,
                message: 'Missing location coordinates'
            });
        }

        // Phase 11: Geofence Check
        const pickupCheck = await geofenceService.isWithinOperationalBounds(parseFloat(pickupLat), parseFloat(pickupLng));
        if (!pickupCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: 'عذراً، منطقة الاستلام خارج نطاق الخدمة حالياً'
            });
        }

        const dropoffCheck = await geofenceService.isWithinOperationalBounds(parseFloat(dropoffLat), parseFloat(dropoffLng));
        if (!dropoffCheck.allowed) {
            return res.status(403).json({
                success: false,
                message: 'عذراً، منطقة التسليم خارج نطاق الخدمة حالياً'
            });
        }

        let parsedDestinations = [];
        if (destinations) {
            parsedDestinations = typeof destinations === 'string' ? JSON.parse(destinations) : destinations;
        }

        const options = pricingService.calculatePriceOptions(
            parseFloat(pickupLat),
            parseFloat(pickupLng),
            parseFloat(dropoffLat),
            parseFloat(dropoffLng),
            parsedDestinations
        );

        // If promo code provided, validate it
        let promoResults = null;
        if (promoCode) {
            const basePrice = options.tiers.find(t => t.id === 'standard').price;
            promoResults = await pricingService.validatePromo(promoCode, basePrice);
            if (promoResults.valid) {
                // Apply discount to all tiers
                options.tiers = options.tiers.map(t => ({
                    ...t,
                    original_price: t.price,
                    price: Math.max(0, t.price - promoResults.discount)
                }));
            }
        }

        res.json({
            success: true,
            ...options,
            promo: promoResults
        });
    } catch (error) {
        console.error('Estimate Price Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.validatePromo = async (req, res) => {
    try {
        const { code, amount } = req.body;
        const result = await pricingService.validatePromo(code, parseFloat(amount));
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const {
            customer_id,
            pickup_location,
            dropoff_location,
            destinations,
            details,
            price,
            courier_id,
            order_type,
            promoCode
        } = req.body;

        // Phase 11: Geofence Validation during creation
        if (pickup_location && pickup_location.lat) {
            const boundsCheck = await geofenceService.isWithinOperationalBounds(pickup_location.lat, pickup_location.lng);
            if (!boundsCheck.allowed) {
                return res.status(403).json({ success: false, message: 'منطقة الطلب خارج حدود الخدمة' });
            }
        }

        // 1. Determine promo discount if applicable
        let discount = 0;
        let promo_id = null;
        if (promoCode) {
            const promoResult = await pricingService.validatePromo(promoCode, parseFloat(price));
            if (promoResult.valid) {
                discount = promoResult.discount;
                promo_id = promoResult.promo_id;

                // Increment promo usage
                const { PromoCode } = require('../models');
                await PromoCode.increment('used_count', { where: { id: promo_id } });
            }
        }

        const finalPrice = Math.max(0, parseFloat(price) - discount);

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
            pickup_address: req.body.pickup_address || null,
            dropoff_latitude: dropoff_location.lat,
            dropoff_longitude: dropoff_location.lng,
            delivery_address: req.body.delivery_address || null,
            destinations: destinations || null, // Store multi-stop details
            details,
            price: finalPrice,
            order_type: req.body.order_type || 'parcel',
            service_tier: req.body.tier_id || 'standard',
            priority: req.body.tier_id === 'fast' ? 3 : (req.body.tier_id === 'economic' ? 1 : 2),
            scheduled_at: req.body.scheduled_at || null,
            promo_code_id: promo_id,
            current_destination_index: 0,
            verification_code: Math.floor(1000 + Math.random() * 9000).toString(),
            status: 'waiting' // Always waiting initially, even if specific courier (courier must accept)
        });

        // Notify nearby couriers via Socket.io
        const io = req.app.get('io');

        // Find couriers within 10km radius
        const availableCouriers = await Courier.findAll({
            where: { availability: true, is_blocked: false }
        });

        const nearbyCouriers = availableCouriers.filter(c => {
            if (!c.latitude || !c.longitude) return false;
            const dist = calculateDistance(
                parseFloat(pickup_location.lat),
                parseFloat(pickup_location.lng),
                parseFloat(c.latitude),
                parseFloat(c.longitude)
            );
            return dist <= 10; // 10km radius
        });

        if (nearbyCouriers.length > 0) {
            nearbyCouriers.forEach(c => {
                io.to(`user_${c.id}`).emit('new_order_nearby', order);

                // Send Push Notification
                pushService.sendPushNotification(
                    c.id,
                    'courier',
                    'طلب جديد متاح',
                    'يوجد طلب جديد متاح بالقرب منك، سارع بقبوله!',
                    { type: 'new_order', orderId: order.id.toString() }
                ).catch(err => console.error('Push Error:', err));
            });
        }

        // Always emit to general room for fallback/dashboard
        io.emit('new_order', order);

        // Update admin stats
        adminController.emitDashboardStats(io);

        res.status(201).json({ success: true, order_id: order.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.updateDestinationProgress = async (req, res) => {
    try {
        const { order_id } = req.params;
        const order = await Order.findByPk(order_id);

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const destinations = order.destinations || [];
        if (order.current_destination_index < destinations.length - 1) {
            order.current_destination_index += 1;
            await order.save();

            // Notify customer
            const io = req.app.get('socketio');
            if (io) {
                io.to(order.id.toString()).emit('destination_reached', {
                    index: order.current_destination_index - 1,
                    next_index: order.current_destination_index
                });
            }

            return res.json({
                success: true,
                message: 'تم تحديث الوجهة الحالية',
                current_index: order.current_destination_index
            });
        } else {
            return res.json({
                success: true,
                message: 'وصلت إلى الوجهة الأخيرة',
                finished: true
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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

        // Create notification for customer
        await Notification.create({
            user_id: order.customer_id,
            role: 'customer',
            type: 'ORDER_ACCEPTED',
            title: 'تم قبول طلبك',
            message: `المندوب وافق على طلبك وهو الآن في الطريق إليك`,
            data: { order_id }
        });

        // Notify customer via socket
        const io = req.app.get('io');
        io.to(`order_${order.id}`).emit('order_status_updated', { order_id, status: 'accepted' });

        // Notify other couriers that this order is taken
        io.emit('order_taken', { order_id: order.id });

        // Send Push Notification
        pushService.sendPushNotification(
            order.customer_id,
            'customer',
            'تم قبول طلبك',
            'المندوب وافق على طلبك وهو الآن في الطريق إليك',
            { type: 'order_status', orderId: order.id.toString() }
        ).catch(err => console.error('Push Error:', err));

        // Update admin stats
        adminController.emitDashboardStats(io);

        res.json({ success: true, message: 'Order accepted' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status, verification_code, proof } = req.body;

        const order = await Order.findByPk(order_id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Verification check for delivered status
        if (status === 'delivered') {
            if (!verification_code || verification_code !== order.verification_code) {
                return res.status(400).json({
                    success: false,
                    message: 'كود التحقق غير صحيح. يرجى إدخال الكود الصحيح من العميل.'
                });
            }
        }

        await Order.sequelize.transaction(async (t) => {
            const updateData = { status };
            if (status === 'picked_up' && proof) updateData.pickup_proof = proof;
            if (status === 'delivered' && proof) updateData.delivery_proof = proof;

            await order.update(updateData, { transaction: t });

            // Create notification for customer
            let notificationTitle = '';
            let notificationMessage = '';

            if (status === 'picked_up') {
                notificationTitle = 'تم استلام الشحنة';
                notificationMessage = 'المندوب استلم الشحنة بنجاح من الموقع';
            } else if (status === 'in_delivery') {
                notificationTitle = 'الشحنة في الطريق';
                notificationMessage = 'المندوب في طريقه الآن لتسليم الشحنة';
            } else if (status === 'delivered') {
                notificationTitle = 'تم التوصيل بنجاح';
                notificationMessage = 'تم توصيل طلبك بنجاح. شكراً لاستخدامك مسار!';

                // Referral Reward: Check if this is the customer's first completed order
                const completedCount = await Order.count({
                    where: {
                        customer_id: order.customer_id,
                        status: 'delivered',
                        id: { [Op.ne]: order.id } // Exclude current order
                    },
                    transaction: t
                });
                if (completedCount === 0) {
                    await referralService.processReferralReward(order.customer_id, 'customer');
                }
            }

            if (notificationTitle) {
                await Notification.create({
                    user_id: order.customer_id,
                    role: 'customer',
                    type: `ORDER_${status.toUpperCase()}`,
                    title: notificationTitle,
                    message: notificationMessage,
                    data: { order_id }
                }, { transaction: t });

                // Send Push Notification
                pushService.sendPushNotification(
                    order.customer_id,
                    'customer',
                    notificationTitle,
                    notificationMessage,
                    { type: 'order_status', orderId: order.id.toString(), status }
                ).catch(err => console.error('Push Error:', err));
            }

            if (status === 'delivered' && order.courier_id) {
                // Phase 8: Dynamic Commission from System Settings
                const { SystemSetting } = require('../models');
                const commissionSetting = await SystemSetting.findOne({ where: { key: 'platform_commission_rate' } });
                const commissionRate = commissionSetting ? parseFloat(commissionSetting.value) / 100 : 0.10; // Default 10% if not set

                const totalPrice = parseFloat(order.price);
                const commission = totalPrice * commissionRate;
                const netEarning = totalPrice - commission;

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

                wallet.balance = parseFloat(wallet.balance) + netEarning;
                await wallet.save({ transaction: t });

                // Create Transaction record for Courier
                await Transaction.create({
                    wallet_id: wallet.id,
                    amount: netEarning,
                    type: 'credit',
                    description: `صافي ربح الرحلة #${order.id} (بعد خصم عمولة ${commission.toFixed(2)} ج.م)`,
                    order_id: order.id
                }, { transaction: t });
            }
        });

        const io = req.app.get('io');

        // Notify courier about wallet update if delivered
        if (status === 'delivered' && order.courier_id) {
            io.to(`user_${order.courier_id} `).emit('wallet_updated', {
                message: 'تم إضافة أرباح الرحلة إلى محفظتك',
                type: 'credit'
            });
        }

        // Notify customer
        io.to(`order_${order.id} `).emit('order_status_updated', { order_id, status });

        // Update admin stats
        adminController.emitDashboardStats(io);

        res.json({ success: true, message: `Order status updated to ${status} ` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getNearbyOrders = async (req, res) => {
    try {
        const { lat, lng, courier_id, radius } = req.query;
        const maxRadius = parseFloat(radius) || 15; // Default 15km

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
            }).filter(order => order.distance <= maxRadius) // Filter by radius
                .sort((a, b) => {
                    // Primary Sort: Priority (DESC)
                    const priorityA = a.priority || 2;
                    const priorityB = b.priority || 2;
                    if (priorityA !== priorityB) return priorityB - priorityA;

                    // Secondary Sort: Distance (ASC)
                    return a.distance - b.distance;
                });
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

        // Validate courier_id
        if (!courier_id || courier_id === 'undefined' || courier_id === 'null') {
            return res.status(400).json({
                success: false,
                message: 'Invalid courier ID provided'
            });
        }

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
            include: [
                {
                    model: Courier,
                    attributes: ['id', 'name', 'phone', 'latitude', 'longitude', 'rating']
                }
            ],
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
                { model: Courier, attributes: ['name', 'phone', 'verification_status', 'profile_image'] }
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
                { model: Customer, attributes: ['id', 'name', 'phone'] },
                { model: Courier, attributes: ['id', 'name', 'phone', 'vehicle_type', 'vehicle_plate', 'rating', 'verification_status', 'profile_image'] },
                { model: OrderTracking, separate: true, order: [['timestamp', 'ASC']] }
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

// Get courier's delivered orders (history)
exports.getCourierOrderHistory = async (req, res) => {
    try {
        const { courier_id } = req.params;

        const orders = await Order.findAll({
            where: {
                courier_id,
                status: 'delivered'
            },
            include: [
                {
                    model: Customer,
                    attributes: ['id', 'name', 'phone']
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        res.json({ success: true, orders });
    } catch (error) {
        console.error('Get Courier Order History Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
// Calculate distance function (helper) - usually outside exports
// ... exists above ...

// Propose a price (Courier)
exports.proposePrice = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { price, courier_id } = req.body;

        const order = await Order.findByPk(order_id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        if (order.status !== 'waiting') {
            return res.status(400).json({ success: false, message: 'لا يمكن التفاوض على هذا الطلب' });
        }

        await order.update({
            proposed_price: price,
            courier_id: courier_id, // Lock negotiation to this courier temporarily? Or just propose
            negotiation_status: 'courier_proposal'
        });

        // Log negotiation
        await NegotiationLog.create({
            order_id: order.id,
            sender_role: 'courier',
            action: 'proposal',
            price: price
        });
        const courier = await Courier.findByPk(courier_id, {
            attributes: ['id', 'name', 'verification_status', 'profile_image', 'rating']
        });

        // Notify customer via socket
        const io = req.app.get('io');
        io.to(`order_${order.id}`).emit('price_proposal', {
            order_id: order.id,
            price: price,
            courier_id: courier_id,
            courier_name: courier ? courier.name : 'Mandoob',
            courier_verified: courier ? courier.verification_status === 'approved' : false,
            courier_rating: courier ? courier.rating : 5.0,
            type: 'proposal'
        });

        // Send Push Notification
        pushService.sendPushNotification(
            order.customer_id,
            'customer',
            'عرض سعر جديد',
            `وصلك عرض سعر جديد بقيمة ${price} جنيه من المندوب ${courier ? courier.name : ''}`,
            { type: 'price_proposal', orderId: order.id.toString() }
        ).catch(err => console.error('Push Error:', err));

        res.json({ success: true, message: 'تم إرسال العرض' });
    } catch (error) {
        console.error('Propose Price Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Respond to proposal (Customer)
exports.respondToProposal = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { response, courier_id } = req.body; // response: 'accept', 'reject'

        const order = await Order.findByPk(order_id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        const io = req.app.get('io');

        if (response === 'accept') {
            await order.update({
                price: order.proposed_price, // Update actual price
                status: 'accepted',
                negotiation_status: 'accepted',
                courier_id: courier_id, // Assign courier
                accepted_at: new Date()
            });

            // Log acceptance
            await NegotiationLog.create({
                order_id: order.id,
                sender_role: 'customer',
                action: 'acceptance',
                price: order.proposed_price
            });

            // Notify courier
            io.emit('order_assigned', { // Broadcast to all or specific courier
                courier_id: courier_id,
                order: order.toJSON()
            });
            // Also specific event
            io.to(`order_${order.id}`).emit('proposal_response', {
                status: 'accepted',
                order_id: order.id
            });

            // Send Push Notification to Courier
            pushService.sendPushNotification(
                courier_id,
                'courier',
                'تم قبول عرضك',
                `العميل وافق على عرض السعر الخاص بك للطلب #${order.id}`,
                { type: 'proposal_response', orderId: order.id.toString(), status: 'accepted' }
            ).catch(err => console.error('Push Error:', err));

        } else if (response === 'reject') {
            await order.update({
                negotiation_status: 'none',
                proposed_price: null
                // keep courier_id null or revert if it was set
            });

            // Log rejection
            await NegotiationLog.create({
                order_id: order.id,
                sender_role: 'customer',
                action: 'rejection'
            });

            // Also specific event
            io.to(`order_${order.id}`).emit('proposal_response', {
                status: 'rejected',
                order_id: order.id
            });

            // Send Push Notification to Courier
            pushService.sendPushNotification(
                courier_id,
                'courier',
                'تم رفض عرضك',
                `نعتذر، العميل رفض عرض السعر الخاص بك للطلب #${order.id}`,
                { type: 'proposal_response', orderId: order.id.toString(), status: 'rejected' }
            ).catch(err => console.error('Push Error:', err));
        }

        res.json({ success: true, message: `Term response: ${response} ` });
    } catch (error) {
        console.error('Respond Proposal Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
