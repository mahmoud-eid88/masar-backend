const { Wallet, Transaction } = require('../models');

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
        const transactions = await Transaction.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: Wallet }] // Assuming association exists
        });
        res.json({ success: true, transactions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
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
        });

        res.json({ success: true, message: `Withdrawal ${status}` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
