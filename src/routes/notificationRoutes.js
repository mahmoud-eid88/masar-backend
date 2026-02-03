const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/token', notificationController.updateToken);

module.exports = router;
