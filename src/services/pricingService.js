/**
 * Pricing Service
 * Calculates delivery costs based on distance and selected tier.
 */

class PricingService {
    constructor() {
        this.BASE_FARE = 15; // Base fee in EGP
        this.COST_PER_KM = 3; // Cost per KM in EGP
        this.MIN_FARE = 20; // Minimum fare
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 
     * @param {number} lon1 
     * @param {number} lat2 
     * @param {number} lon2 
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return Number(d.toFixed(2));
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Generate pricing tiers
     * @param {number} pickupLat 
     * @param {number} pickupLng 
     * @param {number} dropoffLat 
     * @param {number} dropoffLng 
     */
    calculatePriceOptions(pickupLat, pickupLng, dropoffLat, dropoffLng) {
        const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);

        // Calculate raw standard price
        let rawPrice = this.BASE_FARE + (distance * this.COST_PER_KM);
        rawPrice = Math.max(rawPrice, this.MIN_FARE);

        return {
            distance_km: distance,
            tiers: [
                {
                    id: 'economic',
                    name: 'توفير',
                    name_en: 'Economic',
                    price: Math.round(rawPrice * 0.9), // 10% discount
                    description: 'انتظار أطول قليلاً، سعر أقل',
                    eta_multiplier: 1.5
                },
                {
                    id: 'standard',
                    name: 'قياسي',
                    name_en: 'Standard',
                    price: Math.round(rawPrice), // Standard price
                    description: 'الخيار المتوازن والأكثر شيوعاً',
                    eta_multiplier: 1.0
                },
                {
                    id: 'fast',
                    name: 'سريع',
                    name_en: 'Fast',
                    price: Math.round(rawPrice * 1.3), // 30% premium
                    description: 'أولوية قصوى في القبول والتوصيل',
                    eta_multiplier: 0.8
                }
            ]
        };
    }
}

module.exports = new PricingService();
