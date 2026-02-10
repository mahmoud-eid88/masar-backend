const express = require('express');
const router = express.Router();
const courierController = require('../controllers/courierController');

// Update courier location
router.patch('/:courierId/location', courierController.updateLocation);

// Update courier availability (online/offline)
router.patch('/:courierId/availability', courierController.updateAvailability);
router.get('/:courierId/stats', courierController.getStats);

// Get nearby couriers with distance
router.get('/nearby', courierController.getNearbyCouriers);

module.exports = router;
