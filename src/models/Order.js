const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Customer = require('./Customer');
const Courier = require('./Courier');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pickup_latitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pickup_longitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    dropoff_latitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    dropoff_longitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('waiting', 'accepted', 'picked_up', 'in_delivery', 'delivered'),
        defaultValue: 'waiting'
    }
}, {
    tableName: 'orders',
    timestamps: true
});

// Relationships
Order.belongsTo(Customer, { foreignKey: 'customer_id' });
Order.belongsTo(Courier, { foreignKey: 'courier_id' });
Customer.hasMany(Order, { foreignKey: 'customer_id' });
Courier.hasMany(Order, { foreignKey: 'courier_id' });

module.exports = Order;
