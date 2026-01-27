const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.post('/optimize/:courier_id', routeController.optimizeRoute);

module.exports = router;
