const sequelize = require('../config/database');
const Customer = require('./Customer');
const Courier = require('./Courier');
const Order = require('./Order');
const Message = require('./Message');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');

const db = {
    sequelize,
    Customer,
    Courier,
    Order,
    Message,
    Wallet,
    Transaction
};

module.exports = db;
