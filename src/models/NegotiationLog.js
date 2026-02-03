const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Order = require('./Order');

const NegotiationLog = sequelize.define('NegotiationLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    sender_role: {
        type: DataTypes.ENUM('courier', 'customer'),
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('proposal', 'acceptance', 'rejection', 'counter'),
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true // Null for rejection
    }
}, {
    tableName: 'negotiation_logs',
    timestamps: true
});

// Association is defined in index.js usually, but we can hint it here or there.
// We'll standardize on index.js or doing it here if circular deps handled.
// Order.hasMany(NegotiationLog, { foreignKey: 'order_id' });
// NegotiationLog.belongsTo(Order, { foreignKey: 'order_id' });

module.exports = NegotiationLog;
