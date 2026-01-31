// Test stats endpoint locally
require('dotenv').config();
process.env.NODE_ENV = 'production';
process.env.FORCE_PROD_DB = 'true';

const { Order, Courier, Customer, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function testStats() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected!');

        console.log('\n=== Testing Stats Queries ===\n');

        const totalOrders = await Order.count();
        console.log('Total Orders:', totalOrders);

        const totalCustomers = await Customer.count();
        console.log('Total Customers:', totalCustomers);

        const totalCouriers = await Courier.count();
        console.log('Total Couriers:', totalCouriers);

        const activeCouriers = await Courier.count({ where: { availability: true } });
        console.log('Active Couriers:', activeCouriers);

        const pendingOrders = await Order.count({ where: { status: 'waiting' } });
        console.log('Pending Orders:', pendingOrders);

        const activeOrders = await Order.count({
            where: {
                status: { [Op.in]: ['accepted', 'picked_up', 'in_delivery'] }
            }
        });
        console.log('Active Orders:', activeOrders);

        const deliveredOrders = await Order.count({ where: { status: 'delivered' } });
        console.log('Delivered Orders:', deliveredOrders);

        // Today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('\nToday:', today);
        console.log('Tomorrow:', tomorrow);

        const todayOrders = await Order.count({
            where: {
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });
        console.log('Today Orders:', todayOrders);

        console.log('\n✅ All stats queries work!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testStats();
