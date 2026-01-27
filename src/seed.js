const { Customer, Courier, Order } = require('./models');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log('Seeding database with test data...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Create Test Customer
        const customer = await Customer.create({
            name: 'Test Customer',
            email: 'customer@test.com',
            password: hashedPassword,
            phone: '0123456789',
            latitude: 30.0444,
            longitude: 31.2357
        });
        console.log('Customer created:', customer.email);

        // 2. Create Test Courier
        const courier = await Courier.create({
            name: 'Test Courier',
            email: 'courier@test.com',
            password: hashedPassword,
            phone: '0987654321',
            latitude: 30.0440,
            longitude: 31.2350,
            availability: true
        });
        console.log('Courier created:', courier.email);

        // 3. Create Test Order
        const order = await Order.create({
            customer_id: customer.id,
            courier_id: courier.id,
            pickup_latitude: 30.0444,
            pickup_longitude: 31.2357,
            dropoff_latitude: 30.0500,
            dropoff_longitude: 31.2400,
            details: 'Fragile package',
            price: 50.00,
            status: 'waiting'
        });
        console.log('Order created for customer:', customer.id);

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
