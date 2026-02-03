const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Customer = require('./Customer');
const Courier = require('./Courier');

const SupportTicket = sequelize.define('SupportTicket', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'open'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
    },
    user_type: {
        type: DataTypes.ENUM('customer', 'courier'),
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'support_tickets',
    timestamps: true
});

// Relationships - Polymorphic-ish association
// We won't use direct polymorphic constraints for simplicity, just ID tracking
// But ideally we might want direct associations if needed. 
// For now, simple ID + Type is enough for fetching.

module.exports = SupportTicket;
