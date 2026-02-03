const { Wallet, Transaction, Notification } = require('../models');
const { Op } = require('sequelize');

exports.getWallet = async (req, res) => {
    try {
        const { user_id, role } = req.query;
        let wallet = await Wallet.findOne({ where: { user_id, role } });

        if (!wallet) {
            wallet = await Wallet.create({ user_id, role, balance: 0 });
        }

        res.json({ success: true, wallet });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const { wallet_id } = req.params;
        const transactions = await Transaction.findAll({
            where: { wallet_id },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.addFunds = async (req, res) => {
    try {
        const { wallet_id, amount, description } = req.body;
        const wallet = await Wallet.findByPk(wallet_id);

        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

        await Wallet.sequelize.transaction(async (t) => {
            wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
            await wallet.save({ transaction: t });

            await Transaction.create({
                wallet_id,
                amount,
                type: 'credit',
                status: 'completed',
                description: description || 'Add funds'
            }, { transaction: t });
        });

        res.json({ success: true, balance: wallet.balance });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const { Wallet, Courier, Customer } = require('../models');
        const transactions = await Transaction.findAll({
            order: [['createdAt', 'DESC']],
            include: [{
                model: Wallet,
                include: [
                    { model: Courier, attributes: ['name'] },
                    { model: Customer, attributes: ['name'] }
                ]
            }]
        });
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getEarningsSummary = async (req, res) => {
    try {
        const { wallet_id } = req.params;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Fix Sunday = 0 logic for startOfWeek
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const daily = await Transaction.sum('amount', {
            where: {
                wallet_id,
                type: 'credit',
                status: 'completed',
                createdAt: { [Op.gte]: startOfDay }
            }
        }) || 0;

        const weekly = await Transaction.sum('amount', {
            where: {
                wallet_id,
                type: 'credit',
                status: 'completed',
                createdAt: { [Op.gte]: startOfWeek }
            }
        }) || 0;

        const monthly = await Transaction.sum('amount', {
            where: {
                wallet_id,
                type: 'credit',
                status: 'completed',
                createdAt: { [Op.gte]: startOfMonth }
            }
        }) || 0;

        res.json({
            success: true,
            summary: {
                daily: parseFloat(daily).toFixed(2),
                weekly: parseFloat(weekly).toFixed(2),
                monthly: parseFloat(monthly).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Earnings Summary Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.withdrawFunds = async (req, res) => {
    try {
        const { wallet_id, amount, description } = req.body;
        const wallet = await Wallet.findByPk(wallet_id);

        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        await Wallet.sequelize.transaction(async (t) => {
            // We DON'T deduct balance yet if it's a request, but for now we follow the plan:
            // "Implement withdrawal request status (Pending/Approved/Rejected) instead of immediate debit."
            // This means we create a PENDING transaction.

            await Transaction.create({
                wallet_id,
                amount,
                type: 'debit',
                status: 'pending',
                description: description || 'Withdrawal request'
            }, { transaction: t });
        });

        res.json({ success: true, message: 'Withdrawal request submitted for approval' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.reviewWithdrawal = async (req, res) => {
    try {
        const { transaction_id, status } = req.body;
        const transaction = await Transaction.findByPk(transaction_id);

        if (!transaction || transaction.type !== 'debit') {
            return res.status(404).json({ success: false, message: 'Transaction not found or invalid' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Transaction already processed' });
        }

        await Transaction.sequelize.transaction(async (t) => {
            if (status === 'approved') {
                const wallet = await Wallet.findByPk(transaction.wallet_id, { transaction: t });
                if (parseFloat(wallet.balance) < parseFloat(transaction.amount)) {
                    throw new Error('Insufficient balance in wallet');
                }
                wallet.balance = parseFloat(wallet.balance) - parseFloat(transaction.amount);
                await wallet.save({ transaction: t });
                transaction.status = 'completed';
            } else {
                transaction.status = 'rejected';
            }
            await transaction.save({ transaction: t });

            // Create persistent notification for user
            const wallet = await Wallet.findByPk(transaction.wallet_id);
            await Notification.create({
                user_id: wallet.user_id,
                role: wallet.role,
                type: status === 'approved' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
                title: status === 'approved' ? 'تمت الموافقة على سحب الرصيد' : 'تم رفض طلب سحب الرصيد',
                message: status === 'approved'
                    ? `تم تحويل مبلغ ${transaction.amount} جنيه إلى حسابك بنجاح.`
                    : `نعتذر، تم رفض طلب سحب مبلغ ${transaction.amount} جنيه.`,
                data: { transaction_id: transaction.id }
            }, { transaction: t });
        });

        // Notify user via socket
        const wallet = await Wallet.findByPk(transaction.wallet_id);
        const io = req.app.get('io');
        // Join specific user room logic if exists, or global notification
        io.to(`user_${wallet.user_id}`).emit('wallet_updated', {
            message: status === 'approved' ? 'تمت الموافقة على سحب الرصيد' : 'تم رفض طلب سحب الرصيد',
            status
        });

        res.json({ success: true, message: `Withdrawal ${status}` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
