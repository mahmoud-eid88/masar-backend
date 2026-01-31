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
                description: description || 'Add funds'
            }, { transaction: t });
        });

        res.json({ success: true, balance: wallet.balance });
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
            wallet.balance = parseFloat(wallet.balance) - parseFloat(amount);
            await wallet.save({ transaction: t });

            await Transaction.create({
                wallet_id,
                amount,
                type: 'debit',
                description: description || 'Withdrawal'
            }, { transaction: t });
        });

        res.json({ success: true, balance: wallet.balance });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
