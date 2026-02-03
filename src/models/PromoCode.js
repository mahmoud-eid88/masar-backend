const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    discount_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        defaultValue: 'percentage'
    },
    discount_value: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    max_discount: {
        type: DataTypes.FLOAT,
        allowNull: true // Max discount for percentage type
    },
    min_order_value: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    usage_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    used_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'promo_codes',
    timestamps: true
});

module.exports = PromoCode;
