const sequelize = require('../config/database');
const Customer = require('./Customer');
const Courier = require('./Courier');
const Order = require('./Order');
const Message = require('./Message');
const Wallet = require('./Wallet');
const Admin = require('./Admin');
const Transaction = require('./Transaction');
const SecurityLog = require('./SecurityLog');
const Rating = require('./Rating');
const OrderMessage = require('./OrderMessage');
const SupportTicket = require('./SupportTicket');
const NegotiationLog = require('./NegotiationLog');
const Notification = require('./Notification');
const PromoCode = require('./PromoCode');

const db = {
    sequelize,
    Customer,
    Courier,
    Admin,
    Order,
    Message,
    Wallet,
    Transaction,
    SecurityLog,
    Rating,
    OrderMessage,
    SupportTicket,
    NegotiationLog,
    Notification,
    PromoCode
};

// Associations
Wallet.hasMany(Transaction, { foreignKey: 'wallet_id' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id' });

Customer.hasOne(Wallet, { foreignKey: 'user_id', constraints: false, scope: { role: 'customer' } });
Courier.hasOne(Wallet, { foreignKey: 'user_id', constraints: false, scope: { role: 'courier' } });
Wallet.belongsTo(Customer, { foreignKey: 'user_id', constraints: false });
Wallet.belongsTo(Courier, { foreignKey: 'user_id', constraints: false });

module.exports = db;

