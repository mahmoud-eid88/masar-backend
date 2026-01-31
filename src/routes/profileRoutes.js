const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure Multer for Memory Storage (Images stored as Buffer)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Update Profile (Handling Images)
router.put('/update', authenticateToken, upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'identity_image', maxCount: 1 }
]), profileController.updateProfile);

// Get Profile
router.get('/', authenticateToken, profileController.getProfile);

module.exports = router;
