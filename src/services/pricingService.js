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
     * Get surge multiplier based on time of day
     * @returns {number} Multiplier
     */
    getSurgeMultiplier() {
        const hour = new Date().getHours();

        // Morning Rush: 7 AM - 10 AM (1.2x)
        if (hour >= 7 && hour <= 10) return 1.2;

        // Evening Rush: 4 PM - 9 PM (1.5x)
        if (hour >= 16 && hour <= 21) return 1.5;

        // Late Night: 12 AM - 5 AM (1.3x)
        if (hour >= 0 && hour <= 5) return 1.3;

        return 1.0;
    }

    /**
     * Calculate total distance for a multi-stop route
     * @param {Array} points List of {lat, lng} objects
     * @returns {number} Total distance in km
     */
    calculateMultiStopDistance(points) {
        if (!points || points.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 0; i < points.length - 1; i++) {
            totalDistance += this.calculateDistance(
                points[i].lat, points[i].lng,
                points[i + 1].lat, points[i + 1].lng
            );
        }
        return Number(totalDistance.toFixed(2));
    }

    /**
     * Validate a promo code
     * @param {string} code 
     * @param {number} orderValue 
     * @returns {Object} { valid: boolean, discount: number, message: string }
     */
    async validatePromo(code, orderValue) {
        const { PromoCode } = require('../models');

        const promo = await PromoCode.findOne({
            where: { code, is_active: true }
        });

        if (!promo) {
            return { valid: false, message: 'كود الخصم غير صالح' };
        }

        if (promo.expires_at && new Date() > new Date(promo.expires_at)) {
            return { valid: false, message: 'كود الخصم منتهي الصلاحية' };
        }

        if (promo.used_count >= promo.usage_limit) {
            return { valid: false, message: 'تم استهلاك كود الخصم بالكامل' };
        }

        if (orderValue < promo.min_order_value) {
            return { valid: false, message: `هذا الكود يتطلب طلباً بقيمة ${promo.min_order_value} ج.م على الأقل` };
        }

        let discount = 0;
        if (promo.discount_type === 'percentage') {
            discount = orderValue * (promo.discount_value / 100);
            if (promo.max_discount) {
                discount = Math.min(discount, promo.max_discount);
            }
        } else {
            discount = promo.discount_value;
        }

        return {
            valid: true,
            discount: Number(discount.toFixed(2)),
            promo_id: promo.id,
            message: 'تم تطبيق الخصم بنجاح'
        };
    }

    /**
     * Generate pricing tiers
     * @param {number} pickupLat 
     * @param {number} pickupLng 
     * @param {number} dropoffLat 
     * @param {number} dropoffLng 
     * @param {Array} destinations Optional list of destinations
     */
    calculatePriceOptions(pickupLat, pickupLng, dropoffLat, dropoffLng, destinations = []) {
        let distance = 0;

        if (destinations && destinations.length > 0) {
            // Include pickup in the points list
            const points = [{ lat: pickupLat, lng: pickupLng }, ...destinations];
            distance = this.calculateMultiStopDistance(points);
        } else {
            distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        }

        const surge = this.getSurgeMultiplier();

        // Calculate raw standard price
        let rawPrice = (this.BASE_FARE + (distance * this.COST_PER_KM)) * surge;
        rawPrice = Math.max(rawPrice, this.MIN_FARE);

        return {
            distance_km: distance,
            surge_multiplier: surge,
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
