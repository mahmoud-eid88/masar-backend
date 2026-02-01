const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const routeRoutes = require('./routes/routeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const managementRoutes = require('./routes/managementRoutes');
const walletRoutes = require('./routes/walletRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const courierRoutes = require('./routes/courierRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();

// Database Connection and Sync
(async () => {
    try {
        // Test database connection
        console.log('Testing database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // ALWAYS sync database tables on startup
        console.log('Syncing database tables...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database tables synced successfully.');
    } catch (err) {
        console.error('❌ Database error:', err.message);
        console.error('Full error:', err);
        // Don't exit - let the server start so we can see errors
        console.warn('⚠️  Server will start but database operations may fail');
    }
})();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes); // Added
app.use('/api/couriers', courierRoutes); // Courier location and availability
app.use('/api/support', supportRoutes); // Technical support system

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
            db_url_exists: !!process.env.DATABASE_URL,
            db_host_exists: !!process.env.DB_HOST,
            db_host_value: process.env.DB_HOST, // Safe to show host
            tables: tables
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            stack: error.stack,
            diagnostics: {
                node_env: process.env.NODE_ENV,
                has_database_url: !!process.env.DATABASE_URL,
                has_db_host: !!process.env.DB_HOST,
                db_host: process.env.DB_HOST,
                db_user: process.env.DB_USER
            }
        });
    }
});

// Force Database Sync Route
app.get('/api/force-db-sync', async (req, res) => {
    try {
        await sequelize.sync({ alter: true });
        res.json({
            status: 'success',
            message: 'Database tables synced successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to sync database',
            error: error.message
        });
    }
});

// Seed Initial Admin Route
const { registerAdmin } = require('./controllers/authController');
app.get('/api/create-initial-admin', async (req, res) => {
    try {
        // Mock request object
        const mockReq = {
            body: {
                name: 'System Admin',
                email: 'admin@masar.com',
                password: 'admin123'
            }
        };
        // Reuse registerAdmin logic
        await registerAdmin(mockReq, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

module.exports = app;
