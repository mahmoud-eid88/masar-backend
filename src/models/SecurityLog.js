const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SecurityLog = sequelize.define('SecurityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userRole: {
        type: DataTypes.ENUM('customer', 'courier', 'admin', 'support'),
        allowNull: false
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'security_logs',
    timestamps: true
});

module.exports = SecurityLog;
