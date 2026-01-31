const { Courier } = require('../models');

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
        const { availability } = req.body;

        const courier = await Courier.findByPk(courierId);
        if (!courier) {
            return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
        }

        await courier.update({ availability });

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

// Get nearby couriers with distance
exports.getNearbyCouriers = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'يرجى تقديم الموقع' });
        }

        const customerLat = parseFloat(lat);
        const customerLng = parseFloat(lng);

        // Get all available couriers
        const couriers = await Courier.findAll({
            where: { availability: true },
            attributes: ['id', 'name', 'latitude', 'longitude', 'rating', 'phone']
        });

        // Calculate distance for each courier (Haversine formula)
        const couriersWithDistance = couriers
            .filter(c => c.latitude && c.longitude)
            .map(courier => {
                const distance = calculateDistance(
                    customerLat, customerLng,
                    courier.latitude, courier.longitude
                );
                return {
                    ...courier.toJSON(),
                    distance: Math.round(distance * 10) / 10 // Round to 1 decimal
                };
            })
            .sort((a, b) => a.distance - b.distance);

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
        const { Customer } = require('../models');

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

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

