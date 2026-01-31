const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Courier = sequelize.define('Courier', {
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
    availability: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
        type: DataTypes.TEXT,
        allowNull: true
    },
    identity_image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    identity_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'couriers',
    timestamps: true
});

module.exports = Courier;
