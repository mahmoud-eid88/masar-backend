const { Courier, Order, OrderTracking } = require('../models');
const { Op } = require('sequelize');

// Update courier location
exports.updateLocation = async (req, res) => {
    try {
        const { courierId } = req.params;
        const { latitude, longitude } = req.body;

        const courier = await Courier.findByPk(courierId);
        if (!courier) {
            return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
        }

        await courier.update({ latitude, longitude });

        // Phase 8: Historical Route Tracking
        // If courier is on an active order (accepted, picked_up, in_delivery), log the point
        const activeOrder = await Order.findOne({
            where: {
                courier_id: courierId,
                status: { [Op.in]: ['accepted', 'picked_up', 'in_delivery'] }
            },
            order: [['updatedAt', 'DESC']]
        });

        if (activeOrder) {
            await OrderTracking.create({
                order_id: activeOrder.id,
                latitude,
                longitude
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث الموقع',
            location: { latitude, longitude }
        });
    } catch (error) {
        console.error('Update Location Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update courier availability (online/offline)
exports.updateAvailability = async (req, res) => {
    try {
        const { courierId } = req.params;
        const { availability, latitude, longitude } = req.body;

        const courier = await Courier.findByPk(courierId);
        if (!courier) {
            return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
        }

        // Build update object
        const updateData = { availability };

        // If going online, update location and last_seen_at
        if (availability) {
            updateData.last_seen_at = new Date();
            if (latitude !== undefined && longitude !== undefined) {
                updateData.latitude = latitude;
                updateData.longitude = longitude;
            }
        }

        await courier.update(updateData);

        res.json({
            success: true,
            message: availability ? 'أنت متصل الآن' : 'أنت غير متصل',
            availability
        });
    } catch (error) {
        console.error('Update Availability Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get nearby couriers with distance (includes recently active in last 10 minutes)
exports.getNearbyCouriers = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'يرجى تقديم الموقع' });
        }

        const customerLat = parseFloat(lat);
        const customerLng = parseFloat(lng);

        // Time threshold: 10 minutes ago
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Get available couriers OR recently active (last 10 minutes)
        const couriers = await Courier.findAll({
            where: {
                [Op.or]: [
                    { availability: true },
                    { last_seen_at: { [Op.gte]: tenMinutesAgo } }
                ]
            },
            attributes: ['id', 'name', 'latitude', 'longitude', 'rating', 'phone', 'availability', 'last_seen_at']
        });

        // Calculate distance for each courier (Haversine formula)
        const couriersWithDistance = couriers
            .filter(c => c.latitude && c.longitude)
            .map(courier => {
                const distance = calculateDistance(
                    customerLat, customerLng,
                    courier.latitude, courier.longitude
                );
                const courierData = courier.toJSON();
                return {
                    ...courierData,
                    distance: Math.round(distance * 10) / 10,
                    isOnline: courierData.availability === true,
                    recentlyActive: !courierData.availability && courierData.last_seen_at && new Date(courierData.last_seen_at) >= tenMinutesAgo
                };
            })
            .sort((a, b) => {
                // Online couriers first, then by distance
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return a.distance - b.distance;
            });

        res.json({
            success: true,
            couriers: couriersWithDistance
        });
    } catch (error) {
        console.error('Get Nearby Couriers Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// Toggle courier availability (for management routes compatibility)
exports.toggleAvailability = async (req, res) => {
    try {
        const { courier_id } = req.params;

        const courier = await Courier.findByPk(courier_id);
        if (!courier) {
            return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
        }

        const newAvailability = !courier.availability;
        await courier.update({ availability: newAvailability });

        res.json({
            success: true,
            message: newAvailability ? 'أنت متصل الآن' : 'أنت غير متصل',
            availability: newAvailability
        });
    } catch (error) {
        console.error('Toggle Availability Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get profile (for management routes compatibility)
exports.getProfile = async (req, res) => {
    try {
        const { role, id } = req.params;
        const { Customer, Order } = require('../models');

        let user;
        if (role === 'courier') {
            user = await Courier.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
        } else if (role === 'customer') {
            user = await Customer.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Add order stats
        const totalOrders = await Order.count({
            where: {
                [role === 'courier' ? 'courier_id' : 'customer_id']: id
            }
        });

        const activeOrders = await Order.count({
            where: {
                [role === 'courier' ? 'courier_id' : 'customer_id']: id,
                status: ['waiting', 'accepted', 'picked_up', 'in_delivery']
            }
        });

        const deliveredOrders = await Order.count({
            where: {
                [role === 'courier' ? 'courier_id' : 'customer_id']: id,
                status: 'delivered'
            }
        });

        res.json({
            success: true,
            user: {
                ...user.toJSON(),
                totalOrders,
                activeOrders,
                deliveredOrders
            }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get courier statistics (Earnings, Ratings, Trips)
exports.getStats = async (req, res) => {
    try {
        const { courierId } = req.params;

        const courier = await Courier.findByPk(courierId);
        if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });

        // Calculate total earnings from delivered orders
        const completedOrders = await Order.findAll({
            where: {
                courier_id: courierId,
                status: 'delivered'
            },
            attributes: ['price']
        });

        const totalEarnings = completedOrders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
        const completedTrips = completedOrders.length;

        // Use stored rating or default to 5.0 if new
        const rating = courier.rating || 5.0;

        res.json({
            success: true,
            stats: {
                total_earnings: totalEarnings,
                completed_trips: completedTrips,
                rating: rating
            }
        });
    } catch (error) {
        console.error('Get Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
