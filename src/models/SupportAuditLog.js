const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportAuditLog = sequelize.define('SupportAuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    agent_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    agent_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    action: {
        type: DataTypes.ENUM('created', 'assigned', 'replied', 'status_changed', 'resolved', 'reopened'),
        allowNull: false
    },
    old_value: {
        type: DataTypes.STRING,
        allowNull: true
    },
    new_value: {
        type: DataTypes.STRING,
        allowNull: true
    },
    message_content: {
        type: DataTypes.TEXT,
        allowNull: true // For 'replied' actions
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'support_audit_logs',
    timestamps: true,
    updatedAt: false // Only track creation time
});

module.exports = SupportAuditLog;
