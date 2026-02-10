const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 5.0
    },
    profile_image: {
        type: DataTypes.TEXT, // Use TEXT to support Base64 strings if needed
        allowNull: true
    },
    default_latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    default_longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    default_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    verification_status: {
        type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
        defaultValue: 'none'
    },
    full_name_arabic: {
        type: DataTypes.STRING,
        allowNull: true
    },
    identity_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    id_card_front: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    id_card_back: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    selfie_image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verification_refusal_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    support_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    referral_code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    referred_by_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fcm_token: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'customers',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['phone'] },
        { unique: true, fields: ['referral_code'] }
    ]
});

module.exports = Customer;
