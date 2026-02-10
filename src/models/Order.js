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
    order_code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true // Will be set after creation
    },
    pickup_latitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pickup_longitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pickup_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dropoff_latitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    dropoff_longitude: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    delivery_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    details: {
        type: DataTypes.TEXT
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('waiting', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled'),
        defaultValue: 'waiting'
    },
    destinations: {
        type: DataTypes.JSON, // Stores array of {lat, lng, address} for multi-stop
        allowNull: true
    },
    proposed_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    negotiation_status: {
        type: DataTypes.ENUM('none', 'courier_proposal', 'customer_counter', 'accepted'),
        defaultValue: 'none'
    },
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    pickup_proof: {
        type: DataTypes.JSON,
        allowNull: true
    },
    delivery_proof: {
        type: DataTypes.JSON,
        allowNull: true
    },
    verification_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    order_type: {
        type: DataTypes.STRING,
        defaultValue: 'parcel'
    },
    service_tier: {
        type: DataTypes.ENUM('economic', 'standard', 'fast'),
        defaultValue: 'standard'
    },
    priority: {
        type: DataTypes.INTEGER, // 1: Human, 2: Standard, 3: High
        defaultValue: 2
    },
    scheduled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    promo_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    current_destination_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Index of the destination in the 'destinations' array being delivered to
    }
}, {
    tableName: 'orders',
    timestamps: true,
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['customer_id']
        },
        {
            fields: ['courier_id']
        },
        {
            fields: ['created_at']
        }
    ],
    hooks: {
        afterCreate: async (order) => {
            // Generate unique order code: MSR-YYYYMMDD-XXXX
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const orderCode = `MSR-${dateStr}-${String(order.id).padStart(4, '0')}`;
            await order.update({ order_code: orderCode });
        }
    }
});

// Relationships
Order.belongsTo(Customer, { foreignKey: 'customer_id' });
Order.belongsTo(Courier, { foreignKey: 'courier_id' });
Customer.hasMany(Order, { foreignKey: 'customer_id' });
Courier.hasMany(Order, { foreignKey: 'courier_id' });

module.exports = Order;
