const { Customer, Courier, Wallet, Transaction } = require('../models');
const crypto = require('crypto');

exports.generateReferralCode = () => {
    return 'MS-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

exports.processReferralReward = async (userId, role) => {
    try {
        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else {
            user = await Courier.findByPk(userId);
        }

        if (!user || !user.referred_by_id) return;

        // check if already rewarded (e.g. if this is the first order)
        // For simplicity, we assume this is called only once when the first order is completed

        const rewardAmount = 10.00; // 10 EGP reward

        // Find the referrer's wallet
        // Note: For now we assume referrer is the same role as the referee. 
        // In a more complex system, we'd need to know the referrer's role too.
        // We'll try finding in both if not sure, but let's stick to same-role for MVP.

        const referrerWallet = await Wallet.findOne({
            where: { user_id: user.referred_by_id, role: role }
        });

        if (referrerWallet) {
            referrerWallet.balance = parseFloat(referrerWallet.balance) + rewardAmount;
            await referrerWallet.save();

            // Create transaction record
            await Transaction.create({
                wallet_id: referrerWallet.id,
                amount: rewardAmount,
                type: 'credit',
                description: `مكافأة دعوة صديق (${user.name})`
            });

            // Send Push Notification
            const pushService = require('./notificationService');
            pushService.sendPushNotification(
                user.referred_by_id,
                role,
                'مبروك! حصلت على مكافأة',
                `تم إضافة ${rewardAmount} جنيه إلى محفظتك لدعوة ${user.name}`,
                { type: 'referral_reward' }
            ).catch(err => console.error('Push Error:', err));

            console.log(`Referral reward of ${rewardAmount} given to ${role} ${user.referred_by_id}`);
        }
    } catch (error) {
        console.error('Error processing referral reward:', error);
    }
};
