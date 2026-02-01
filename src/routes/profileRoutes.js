const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure Multer for Memory Storage (Images stored as Buffer)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit for high-quality camera photos
        files: 5 // Maximum 5 files at once
    }
});

// Update Profile (Handling Images)
router.put('/update', authenticateToken, upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'identity_image', maxCount: 1 }
]), profileController.updateProfile);

// Get Profile
router.get('/', authenticateToken, profileController.getProfile);

// Change Password
router.post('/change-password', authenticateToken, profileController.changePassword);

// Submit Identity Verification (Multipart - legacy)
router.post('/submit-verification', authenticateToken, upload.fields([
    { name: 'id_card_front', maxCount: 1 },
    { name: 'id_card_back', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 }
]), profileController.submitVerification);

// Submit Identity Verification (JSON with base64 images - new)
router.post('/submit-verification-json', authenticateToken, profileController.submitVerificationJSON);

// Get Security Logs
router.get('/logs', authenticateToken, profileController.getSecurityLogs);

module.exports = router;
