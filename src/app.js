const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

// Import Routes
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
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ==========================================
// Database Connection & Sync
// ==========================================
(async () => {
    try {
        console.log('🔄 Connecting to Database...');
        await sequelize.authenticate();
        console.log('✅ Database Connection Established.');

        // IN PRODUCTION: You might want to remove 'alter: true' and use migrations.
        // For now, checks schema vs code and updates DB.
        console.log('🔄 Syncing Database Schema...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database Synced Successfully.');
    } catch (err) {
        console.error('❌ Database Connection Error:', err.message);
        // We don't exit the process so that the server can still respond to health checks
    }
})();

// ==========================================
// Middlewares
// ==========================================
// CORS: Allow all origins for mobile apps
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers (Increased limit for image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging (Use 'tiny' or 'combined' in production for less noise)
app.use(morgan('tiny'));

// Security Middlewares
app.use(helmet()); // Set security headers
app.set('trust proxy', 1); // For Railway/Render load balancers

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 login/register attempts per hour
    message: { success: false, message: 'Too many auth attempts. Try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);

// ==========================================
// API Routes
// ==========================================
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/routes`, routeRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/management`, managementRoutes);
app.use(`${API_PREFIX}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/couriers`, courierRoutes);
app.use(`${API_PREFIX}/support`, supportRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);

const logger = require('./services/loggerService');

// Health Check Route (for Railway/AWS lb)
app.get('/', (req, res) => {
    logger.info('Health check pinged');
    res.status(200).json({
        status: 'online',
        message: 'Masar Backend API is running',
        timestamp: new Date()
    });
});

// ==========================================
// Error Handling
// ==========================================
app.use((err, req, res, next) => {
    logger.error(`🔥 Unhandled Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
