const { SystemSetting } = require('../models');

/**
 * Calculate distance between two points in km (Haversine formula)
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Check if a location is within the operational geofence
 */
exports.isWithinOperationalBounds = async (lat, lng) => {
    try {
        // Fetch geofence settings
        const centerSetting = await SystemSetting.findOne({ where: { key: 'operation_center' } });
        const radiusSetting = await SystemSetting.findOne({ where: { key: 'operation_radius_km' } });

        // If settings not found, allow all (default behavior)
        if (!centerSetting || !radiusSetting) return { allowed: true };

        const [centerLat, centerLng] = centerSetting.value.split(',').map(v => parseFloat(v.trim()));
        const radius = parseFloat(radiusSetting.value);

        const distance = getDistance(lat, lng, centerLat, centerLng);

        return {
            allowed: distance <= radius,
            distance,
            radius
        };
    } catch (error) {
        console.error('Geofence Check Error:', error);
        return { allowed: true }; // Fail-safe: allow if error
    }
};
