const { Courier } = require('../models');

exports.toggleAvailability = async (req, res) => {
    try {
        const { courier_id } = req.params;
        const courier = await Courier.findByPk(courier_id);
        if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });

        courier.availability = !courier.availability;
        await courier.save();

        res.json({ success: true, availability: courier.availability });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { id, role } = req.params;
        let profile;

        if (role === 'courier') {
            profile = await Courier.findByPk(id, {
                attributes: ['id', 'name', 'email', 'phone', 'rating', 'availability']
            });
        } else if (role === 'admin') {
            const Admin = require('../models/Admin');
            profile = await Admin.findByPk(id, {
                attributes: ['id', 'name', 'email']
            });
            if (profile) {
                profile.setDataValue('role', 'admin');
                profile.setDataValue('rating', 5.0); // Placeholder
                profile.setDataValue('phone', 'Support'); // Placeholder
            }
        } else {
            const { Customer } = require('../models');
            profile = await Customer.findByPk(id, {
                attributes: ['id', 'name', 'email', 'phone', 'rating']
            });
        }

        if (!profile) {
            console.warn(`Profile not found for ID: ${id}, Role: ${role}`);
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getNearbyCouriers = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Location (lat, lng) is required' });
        }

        // Fetch available couriers
        const couriers = await Courier.findAll({
            where: { availability: true },
            attributes: ['id', 'name', 'rating', 'latitude', 'longitude']
        });

        // Calculate distance and sort
        const nearbyCouriers = couriers.map(courier => {
            const distance = calculateDistance(lat, lng, courier.latitude, courier.longitude);

            return {
                id: courier.id,
                name: courier.name,
                rating: courier.rating || 5.0,
                tripCount: 0, // Placeholder
                distance: distance.toFixed(1),
                type: 'courier' // for frontend selection logic
            };
        }).sort((a, b) => a.distance - b.distance).slice(0, 5); // Return top 5

        res.json({ success: true, couriers: nearbyCouriers });
    } catch (error) {
        console.error('Get Nearby Couriers Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
