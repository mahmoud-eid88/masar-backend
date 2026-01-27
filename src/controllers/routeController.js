const { Order } = require('../models');

/**
 * Simple distance calculation between two points (Haversine formula or Euclidean for simplicity)
 */
const calculateDistance = (p1, p2) => {
    const lat1 = p1[1];
    const lon1 = p1[0];
    const lat2 = p2[1];
    const lon2 = p2[0];

    // Using simple Euclidean distance for small areas (like a city)
    // For more accuracy, use Haversine formula
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

exports.optimizeRoute = async (req, res) => {
    try {
        const { courier_id } = req.params;
        const { current_location } = req.body; // { lat, lng }

        // Fetch all active orders for this courier
        const orders = await Order.findAll({
            where: {
                courier_id,
                status: ['accepted', 'picked_up', 'in_delivery']
            }
        });

        if (orders.length === 0) {
            return res.json({ success: true, route: [] });
        }

        // We have multiple points: Current Location, Order P1, Order D1, Order P2, Order D2...
        // Constraint: Must pick up Pi before Di.

        let points = [];
        orders.forEach(order => {
            // Add Pickup
            points.push({
                id: `pickup_${order.id}`,
                orderId: order.id,
                type: 'pickup',
                coords: [order.pickup_longitude, order.pickup_latitude], // [lng, lat]
                completed: order.status !== 'accepted' // If status is picked_up, pickup is done
            });
            // Add Dropoff
            points.push({
                id: `dropoff_${order.id}`,
                orderId: order.id,
                type: 'dropoff',
                coords: [order.dropoff_longitude, order.dropoff_latitude],
                completed: false
            });
        });

        // Filter out completed points
        let remainingPoints = points.filter(p => !p.completed);

        // Simple Greedy Algorithm (Nearest Neighbor) with constraints
        let route = [];
        let currentPos = [current_location.lng, current_location.lat];

        while (remainingPoints.length > 0) {
            let nearestIdx = -1;
            let minDistance = Infinity;

            for (let i = 0; i < remainingPoints.length; i++) {
                const p = remainingPoints[i];

                // Constraint Check: Can't drop off before picking up
                if (p.type === 'dropoff') {
                    const pickupDone = route.some(rp => rp.id === `pickup_${p.orderId}`) ||
                        points.find(op => op.id === `pickup_${p.orderId}`).completed;
                    if (!pickupDone) continue;
                }

                const dist = calculateDistance(currentPos, p.coords);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIdx = i;
                }
            }

            if (nearestIdx === -1) break; // Should not happen with 4 orders

            const nextPoint = remainingPoints.splice(nearestIdx, 1)[0];
            route.push(nextPoint);
            currentPos = nextPoint.coords;
        }

        res.json({ success: true, route });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
