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
    NegotiationLog
};

module.exports = db;

