const { Customer, Courier } = require('../models');
const { admin, isFirebaseInitialized } = require('../config/firebase');

/**
 * Service to handle push notification dispatching
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

        if (isFirebaseInitialized) {
            const message = {
                notification: { title, body },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                token: user.fcm_token,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'masar_notifications'
                    }
                }
            };
            await admin.messaging().send(message);
            console.log(`✅ FCM sent successfully to ${role} ${userId}`);
        } else {
            console.log(`📝 FCM (Simulated) for ${role} ${userId}: ${title} - ${body}`);
        }

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
