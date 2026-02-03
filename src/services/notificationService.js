const axios = require('axios');
const { Customer, Courier } = require('../models');

/**
 * Service to handle push notification dispatching
 * In a real production environment, this would use 'firebase-admin'
 * For this implementation, we will create the infrastructure that can be easily linked to FCM.
 */

exports.sendPushNotification = async (userId, role, title, body, data = {}) => {
    try {
        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user || !user.fcm_token) {
            console.log(`Push skipped for ${role} ${userId}: No FCM token found.`);
            return false;
        }

        console.log(`[PUSH DISPATCH] To: ${user.fcm_token} | Title: ${title} | Body: ${body}`);

        // Placeholder for FCM call:
        /*
        const message = {
            notification: { title, body },
            data: data,
            token: user.fcm_token,
        };
        await admin.messaging().send(message);
        */

        return true;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
};

/**
 * Update FCM token for a user
 */
exports.updateFcmToken = async (userId, role, token) => {
    try {
        if (role === 'customer') {
            await Customer.update({ fcm_token: token }, { where: { id: userId } });
        } else if (role === 'courier') {
            await Courier.update({ fcm_token: token }, { where: { id: userId } });
        }
        return true;
    } catch (error) {
        console.error('Error updating FCM token:', error);
        return false;
    }
};
