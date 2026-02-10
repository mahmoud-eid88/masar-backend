const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    wallet_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'rejected'),
        defaultValue: 'completed'
    },
    payment_method: {
        type: DataTypes.ENUM('card', 'vodafone_cash', 'orange_cash', 'etisalat_cash', 'fawry', 'instapay', 'admin', 'order_earning'),
        allowNull: true
    },
    payment_reference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    card_last_four: {
        type: DataTypes.STRING(4),
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: true
});

module.exports = Transaction;
