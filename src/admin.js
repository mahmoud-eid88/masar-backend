const { sequelize, Customer, Courier, Order, Message } = require('./models');

const action = process.argv[2];
const modelName = process.argv[3];

const runAdmin = async () => {
    try {
        await sequelize.authenticate();

        if (action === 'list') {
            let data;
            switch (modelName) {
                case 'customers': data = await Customer.findAll(); break;
                case 'couriers': data = await Courier.findAll(); break;
                case 'orders': data = await Order.findAll(); break;
                case 'messages': data = await Message.findAll(); break;
                default: console.log('Unknown model'); return;
            }
            console.log(JSON.stringify(data, null, 2));
        } else if (action === 'stats') {
            const counts = {
                customers: await Customer.count(),
                couriers: await Courier.count(),
                orders: await Order.count(),
                messages: await Message.count(),
            };
            console.log('--- Database Statistics ---');
            console.table(counts);
        }

        process.exit(0);
    } catch (error) {
        console.error('Admin Error:', error);
        process.exit(1);
    }
};

runAdmin();
