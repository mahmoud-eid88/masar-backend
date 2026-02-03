const pushService = require('../services/notificationService');

exports.updateToken = async (req, res) => {
    try {
        const { userId, role, token } = req.body;

        if (!userId || !role || !token) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        const success = await pushService.updateFcmToken(userId, role, token);

        if (success) {
            res.json({ success: true, message: 'FCM token updated' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to update token' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
