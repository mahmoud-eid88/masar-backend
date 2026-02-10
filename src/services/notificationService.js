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
/**
 * Send broadcast notification to multiple users
 */
exports.sendBroadcastNotification = async (target, title, body, data = {}) => {
    try {
        let tokens = [];
        if (target === 'customers' || target === 'all') {
            const customers = await Customer.findAll({ where: { fcm_token: { [require('sequelize').Op.ne]: null } } });
            tokens = [...tokens, ...customers.map(c => c.fcm_token)];
        }
        if (target === 'couriers' || target === 'all') {
            const couriers = await Courier.findAll({ where: { fcm_token: { [require('sequelize').Op.ne]: null } } });
            tokens = [...tokens, ...couriers.map(c => c.fcm_token)];
        }

        if (tokens.length === 0) return { success: true, count: 0 };

        console.log(`[BROADCAST DISPATCH] To: ${tokens.length} devices | Title: ${title}`);

        if (isFirebaseInitialized) {
            const message = {
                notification: { title, body },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'masar_notifications'
                    }
                }
            };

            // Firebase supports multicast sending
            const response = await admin.messaging().sendMulticast({
                tokens: tokens,
                ...message
            });
            console.log(`✅ Broadcast sent: ${response.successCount} success, ${response.failureCount} failure`);
            return { success: true, count: response.successCount };
        } else {
            console.log(`📝 Broadcast (Simulated): ${title} to ${tokens.length} devices`);
            return { success: true, count: tokens.length };
        }
    } catch (error) {
        console.error('Broadcast error:', error);
        return { success: false, error: error.message };
    }
};
