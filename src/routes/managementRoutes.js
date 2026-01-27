const express = require('express');
const router = express.Router();
const courierController = require('../controllers/courierController');

router.post('/toggle-availability/:courier_id', courierController.toggleAvailability);
router.get('/profile/:role/:id', courierController.getProfile);

module.exports = router;
