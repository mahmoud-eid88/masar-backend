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
const SystemSetting = require('./SystemSetting');
const OrderTracking = require('./OrderTracking');
const SupportMessage = require('./SupportMessage');
const SupportAuditLog = require('./SupportAuditLog');

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
    PromoCode,
    SystemSetting,
    OrderTracking,
    SupportMessage,
    SupportAuditLog
};

// Associations
Wallet.hasMany(Transaction, { foreignKey: 'wallet_id' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id' });

Customer.hasOne(Wallet, { foreignKey: 'user_id', constraints: false, scope: { role: 'customer' } });
Courier.hasOne(Wallet, { foreignKey: 'user_id', constraints: false, scope: { role: 'courier' } });
Wallet.belongsTo(Customer, { foreignKey: 'user_id', constraints: false });
Wallet.belongsTo(Courier, { foreignKey: 'user_id', constraints: false });

Order.hasMany(OrderTracking, { foreignKey: 'order_id' });
OrderTracking.belongsTo(Order, { foreignKey: 'order_id' });

// Support Ticket associations
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id' });
SupportTicket.hasMany(SupportAuditLog, { foreignKey: 'ticket_id', as: 'auditLogs' });
SupportAuditLog.belongsTo(SupportTicket, { foreignKey: 'ticket_id' });

module.exports = db;

