const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderMessage = sequelize.define('OrderMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sender_role: {
        type: DataTypes.ENUM('customer', 'courier'),
        allowNull: false
    },
    sender_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'order_messages',
    timestamps: true
});

module.exports = OrderMessage;
