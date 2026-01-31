const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const routeRoutes = require('./routes/routeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const managementRoutes = require('./routes/managementRoutes');
const walletRoutes = require('./routes/walletRoutes');

dotenv.config();

const app = express();

// Database Connection and Sync
(async () => {
    try {
        // Test database connection
        console.log('Testing database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync database tables if SYNC_DB is enabled
        if (process.env.SYNC_DB === 'true') {
            console.log('Syncing database tables...');
            await sequelize.sync({ alter: true });
            console.log('✅ Database tables synced successfully.');
        } else if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: Syncing database tables...');
            await sequelize.sync({ alter: true });
            console.log('✅ Database tables synced successfully.');
        } else {
            console.log('ℹ️  Database sync skipped. Set SYNC_DB=true to enable.');
        }
    } catch (err) {
        console.error('❌ Database error:', err.message);
        console.error('Full error:', err);
        // Don't exit - let the server start so we can see errors
        console.warn('⚠️  Server will start but database operations may fail');
    }
})();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Masar API' });
});

// Debug Route: Check Database Status
app.get('/api/db-check', async (req, res) => {
    try {
        await sequelize.authenticate();
        const tables = await sequelize.getQueryInterface().showAllSchemas();
        // Check if User table exists
        const userCount = await sequelize.models.User ? await sequelize.models.User.count() : 'User model not loaded';

        res.json({
            status: 'success',
            message: 'Database connection established',
            user_count: userCount,
            env_sync_db: process.env.SYNC_DB,
            node_env: process.env.NODE_ENV,
            tables: tables
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            stack: error.stack
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

module.exports = app;
