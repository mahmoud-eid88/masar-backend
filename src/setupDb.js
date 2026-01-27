const { sequelize, Customer, Courier, Order, Message } = require('./models');

const setupDatabase = async () => {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // For PostGIS: We need to ensure the extension exists
        // Note: This requires superuser privileges or specific permissions
        try {
            await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
            console.log('PostGIS extension ensured.');
        } catch (e) {
            console.warn('Could not create PostGIS extension. Ensure it is enabled in your database.');
        }

        console.log('Syncing models with database...');
        // { force: true } will drop existing tables and recreate them
        // Use { alter: true } for production-like updates without dropping data
        await sequelize.sync({ force: true });

        console.log('Database synced successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database or sync models:', error);
        process.exit(1);
    }
};

setupDatabase();
