const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportMessage = sequelize.define('SupportMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_role: {
        type: DataTypes.STRING, // customer, courier
        allowNull: false
    },
    user_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_support: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // false = user sent, true = support replied
    },
    support_agent_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // For order-related support
    related_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
        defaultValue: 'open'
    }
}, {
    timestamps: true,
    tableName: 'support_messages'
});

module.exports = SupportMessage;
