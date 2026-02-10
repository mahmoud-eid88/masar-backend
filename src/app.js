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

        console.log('🔄 Syncing Database Schema...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database Synced Successfully.');

        // Seed min_app_version if not exists
        const { SystemSetting } = require('./models');
        const [setting] = await SystemSetting.findOrCreate({
            where: { key: 'min_app_version' },
            defaults: {
                key: 'min_app_version',
                value: '1.1.0',
                type: 'string',
                description: 'الحد الأدنى لإصدار التطبيق المسموح به'
            }
        });
        console.log(`✅ Min App Version: ${setting.value}`);
    } catch (err) {
        console.error('❌ Database Connection Error:', err.message);
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
// Version Check Middleware
// ==========================================
app.use('/api/', async (req, res, next) => {
    // Skip version check for the check-version endpoint itself and health check
    if (req.path === '/check-version' || req.path === '/') {
        return next();
    }

    const clientVersion = req.headers['x-app-version'];
    if (!clientVersion) {
        return next(); // Allow requests without version header (web dashboard, etc.)
    }

    try {
        const { SystemSetting } = require('./models');
        const setting = await SystemSetting.findOne({ where: { key: 'min_app_version' } });
        if (setting) {
            const minVersion = setting.value;
            if (compareVersions(clientVersion, minVersion) < 0) {
                return res.status(426).json({
                    success: false,
                    error: 'UPDATE_REQUIRED',
                    message: 'يجب تحديث التطبيق للإصدار الأحدث للاستمرار',
                    min_version: minVersion,
                    current_version: clientVersion
                });
            }
        }
    } catch (err) {
        console.error('Version check error:', err.message);
        // Don't block on version check errors
    }
    next();
});

// Compare semantic versions: returns -1, 0, or 1
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
}

// Version Check Endpoint
app.get('/api/check-version', async (req, res) => {
    try {
        const { SystemSetting } = require('./models');
        const setting = await SystemSetting.findOne({ where: { key: 'min_app_version' } });
        const minVersion = setting ? setting.value : '1.0.0';
        const clientVersion = req.query.version || req.headers['x-app-version'];
        const needsUpdate = clientVersion ? compareVersions(clientVersion, minVersion) < 0 : false;

        res.json({
            success: true,
            min_version: minVersion,
            current_version: clientVersion || 'unknown',
            needs_update: needsUpdate
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
