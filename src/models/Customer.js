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
    }
}, {
    tableName: 'customers',
    timestamps: true
});

module.exports = Customer;
