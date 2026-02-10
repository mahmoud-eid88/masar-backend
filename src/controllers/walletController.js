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
        const { wallet_id, amount, payment_method, payment_details } = req.body;

        // Validate required fields
        if (!payment_method) {
            return res.status(400).json({ success: false, message: 'طريقة الدفع مطلوبة' });
        }
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'المبلغ غير صحيح' });
        }
        if (parseFloat(amount) > 50000) {
            return res.status(400).json({ success: false, message: 'الحد الأقصى للشحن 50,000 ج.م' });
        }

        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });

        // Validate payment details based on method
        const validationResult = validatePaymentDetails(payment_method, payment_details);
        if (!validationResult.valid) {
            return res.status(400).json({ success: false, message: validationResult.message });
        }

        // Process payment (in production, this would call the payment gateway API)
        // For now, we validate the format and structure of payment data
        let paymentReference = null;
        let cardLastFour = null;
        let description = '';

        switch (payment_method) {
            case 'card':
                cardLastFour = payment_details.card_number.slice(-4);
                paymentReference = `CARD_${Date.now()}_${cardLastFour}`;
                description = `شحن بالبطاقة ****${cardLastFour}`;
                break;
            case 'vodafone_cash':
                paymentReference = `VCASH_${Date.now()}_${payment_details.phone}`;
                description = `شحن فودافون كاش ${payment_details.phone}`;
                break;
            case 'orange_cash':
                paymentReference = `OCASH_${Date.now()}_${payment_details.phone}`;
                description = `شحن أورانج كاش ${payment_details.phone}`;
                break;
            case 'etisalat_cash':
                paymentReference = `ECASH_${Date.now()}_${payment_details.phone}`;
                description = `شحن إتصالات كاش ${payment_details.phone}`;
                break;
            case 'fawry':
                paymentReference = payment_details.reference_number;
                description = `شحن فوري - مرجع: ${payment_details.reference_number}`;
                break;
            case 'instapay':
                paymentReference = payment_details.reference_number;
                description = `شحن إنستاباي - مرجع: ${payment_details.reference_number}`;
                break;
            default:
                return res.status(400).json({ success: false, message: 'طريقة دفع غير مدعومة' });
        }

        // Execute atomic transaction — credit balance + log
        await Wallet.sequelize.transaction(async (t) => {
            wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
            await wallet.save({ transaction: t });

            await Transaction.create({
                wallet_id,
                amount,
                type: 'credit',
                status: 'completed',
                description,
                payment_method,
                payment_reference: paymentReference,
                card_last_four: cardLastFour
            }, { transaction: t });
        });

        // Send notification
        try {
            const Notification = require('../models').Notification;
            await Notification.create({
                user_id: wallet.user_id,
                role: wallet.role,
                type: 'WALLET_TOPUP',
                title: 'تم شحن المحفظة',
                message: `تم شحن محفظتك بمبلغ ${amount} ج.م بنجاح`,
                data: { payment_method, amount }
            });
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        // Socket notification
        const io = req.app.get('io');
        io.to(`user_${wallet.user_id}`).emit('wallet_updated', {
            balance: wallet.balance,
            message: `تم شحن المحفظة بمبلغ ${amount} ج.م`
        });

        res.json({ success: true, balance: wallet.balance, reference: paymentReference });
    } catch (error) {
        console.error('Add Funds Error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// Payment validation helper
function validatePaymentDetails(method, details) {
    if (!details) {
        return { valid: false, message: 'بيانات الدفع مطلوبة' };
    }

    switch (method) {
        case 'card': {
            const { card_number, expiry_month, expiry_year, cvv, holder_name } = details;
            if (!card_number || !expiry_month || !expiry_year || !cvv || !holder_name) {
                return { valid: false, message: 'جميع بيانات البطاقة مطلوبة' };
            }
            // Strip spaces/dashes
            const cleanCard = card_number.replace(/[\s-]/g, '');
            if (!/^\d{16}$/.test(cleanCard)) {
                return { valid: false, message: 'رقم البطاقة يجب أن يكون 16 رقم' };
            }
            // Luhn algorithm check
            if (!luhnCheck(cleanCard)) {
                return { valid: false, message: 'رقم البطاقة غير صحيح' };
            }
            const month = parseInt(expiry_month);
            const year = parseInt(expiry_year);
            if (month < 1 || month > 12) {
                return { valid: false, message: 'شهر انتهاء الصلاحية غير صحيح' };
            }
            const now = new Date();
            const expiry = new Date(year < 100 ? 2000 + year : year, month);
            if (expiry <= now) {
                return { valid: false, message: 'البطاقة منتهية الصلاحية' };
            }
            if (!/^\d{3,4}$/.test(cvv)) {
                return { valid: false, message: 'رمز CVV غير صحيح' };
            }
            if (holder_name.trim().length < 3) {
                return { valid: false, message: 'اسم حامل البطاقة مطلوب' };
            }
            return { valid: true };
        }

        case 'vodafone_cash': {
            if (!details.phone) return { valid: false, message: 'رقم الهاتف مطلوب' };
            if (!/^01[0-2,5]\d{8}$/.test(details.phone)) {
                return { valid: false, message: 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015)' };
            }
            if (!details.pin || details.pin.length < 4) {
                return { valid: false, message: 'رمز PIN مطلوب (4 أرقام على الأقل)' };
            }
            return { valid: true };
        }

        case 'orange_cash':
        case 'etisalat_cash': {
            if (!details.phone) return { valid: false, message: 'رقم الهاتف مطلوب' };
            if (!/^01[0-2,5]\d{8}$/.test(details.phone)) {
                return { valid: false, message: 'رقم الهاتف غير صحيح' };
            }
            if (!details.pin || details.pin.length < 4) {
                return { valid: false, message: 'رمز PIN مطلوب' };
            }
            return { valid: true };
        }

        case 'fawry':
        case 'instapay': {
            if (!details.reference_number) {
                return { valid: false, message: 'رقم المرجع مطلوب' };
            }
            if (details.reference_number.trim().length < 6) {
                return { valid: false, message: 'رقم المرجع يجب أن يكون 6 أحرف على الأقل' };
            }
            return { valid: true };
        }

        default:
            return { valid: false, message: 'طريقة دفع غير مدعومة' };
    }
}

// Luhn algorithm for card number validation
function luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i], 10);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}

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

        // Send Push Notification
        const pushService = require('../services/notificationService');
        pushService.sendPushNotification(
            wallet.user_id,
            wallet.role,
            status === 'approved' ? 'تمت الموافقة على سحب الرصيد' : 'تم رفض طلب سحب الرصيد',
            status === 'approved'
                ? `تم تحول مبلغ ${transaction.amount} جنيه إلى حسابك بنجاح.`
                : `نعتذر، تم رفض طلب سحب مبلغ ${transaction.amount} جنيه.`,
            { type: 'wallet_update' }
        ).catch(err => console.error('Push Error:', err));

        res.json({ success: true, message: `Withdrawal ${status}` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getAdminFinancialStats = async (req, res) => {
    try {
        // 1. Gross Revenue (Total price of all delivered orders)
        const totalGrossRevenue = await Transaction.sequelize.models.Order.sum('price', {
            where: { status: 'delivered' }
        }) || 0;

        // 2. Net Platform Commission (Total of all 'commission' logs or derived from transactions)
        // Since we don't log commission as a separate transaction yet, let's calculate it:
        // (Total Gross - Total Courier Credits for orders)
        const totalCourierCredits = await Transaction.sum('amount', {
            where: {
                type: 'credit',
                description: { [Op.like]: '%صافي ربح الرحلة%' }
            }
        }) || 0;

        const netProfit = totalGrossRevenue - totalCourierCredits;

        // 3. Total Payouts (Completed withdrawal transactions)
        const totalPayouts = await Transaction.sum('amount', {
            where: {
                type: 'debit',
                status: 'completed',
                description: { [Op.like]: '%سحب%' }
            }
        }) || 0;

        // 4. Pending Withdrawals
        const pendingPayoutsCount = await Transaction.count({
            where: {
                type: 'debit',
                status: 'pending'
            }
        });

        res.json({
            success: true,
            stats: {
                totalGrossRevenue: parseFloat(totalGrossRevenue).toFixed(2),
                netProfit: parseFloat(netProfit).toFixed(2),
                totalPayouts: parseFloat(totalPayouts).toFixed(2),
                pendingPayoutsCount
            }
        });
    } catch (error) {
        console.error('Get Admin Financial Stats Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
